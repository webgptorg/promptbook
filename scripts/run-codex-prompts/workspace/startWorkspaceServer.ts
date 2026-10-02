import { createServer } from 'net';
import { join } from 'path';
import type { number_port } from '../../../src/types/number_positive';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { RunOptions } from '../cli/RunOptions';
import { initializeCoderProjectConfiguration } from '../../../src/cli/cli-commands/coder/initializeCoderProjectConfiguration';
import { $assertSufficientFreeDiskSpace } from '../../../src/cli/cli-commands/common/disk-space/$assertSufficientFreeDiskSpace';
import { createAgentsServerChildEnvironment } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/AgentsServerChildEnvironment';
import { resolveAgentsServerRuntimePaths } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/AgentsServerRuntimePaths';
import type { AgentsServerSupervisorState } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/AgentsServerSupervisorState';
import { assertNextServerStillRunning } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/AgentsServerSupervisorState';
import { startAgentsServerWeb } from '../../../src/cli/cli-commands/agents-server/startAgentsServer/startAgentsServerWeb';
import { LocalSqliteSupabaseClient } from '../../../apps/agents-server/src/database/sqlite/localSqliteSupabase/LocalSqliteSupabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAgentGitIdentity, buildAgentGitEnv } from '../git/agentGitIdentity';
import { relative } from 'path';
import { resolveConfinedWorkspacePath } from './workspaceAgentFiles';
import { createWorkspaceTerminal } from './WorkspaceTerminal';
import {
    $provideSqliteDatabaseAtPath,
    $closeAgentsServerSqliteDatabases,
} from '../../../apps/agents-server/src/database/sqlite/$provideAgentsServerSqliteDatabase';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import { acquireWorkspaceLease, executeWorkspaceGit, withWorkspaceMutation } from '../git/workspaceMutation';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { listRunnablePrompts } from '../prompts/listRunnablePrompts';
import { AgentCollectionInWorkspace } from './AgentCollectionInWorkspace';
import { discoverWorkspaceAgentFiles } from './workspaceAgentFiles';
import { WorkspaceState } from './WorkspaceState';
import { WorkspaceGitSynchronization } from './WorkspaceGitSynchronization';
import { WorkspaceSupervisor } from './WorkspaceSupervisor';
import { loadWorkspaceExecutionConfiguration } from './workspaceExecutionSelection';
import { ensureCoderGitignoreRules } from '../../../src/cli/cli-commands/coder/ensureCoderGitignoreFile';
import {
    createWorkspaceServerEnvironment,
    readWorkspaceEnvironment,
    resolveWorkspaceStoragePaths,
    WORKSPACE_SERVER_SECRETS_PATH,
} from './workspaceServerEnvironment';

/** Long-lived server options stay distinct from the finite runner's selected-agent and confirmation policy. */
export type WorkspaceServerOptions = RunOptions & {
    readonly port: number_port;
    readonly agentFilter?: string;
    readonly isPaused: boolean;
    readonly isBuildForced: boolean;
};

/**
 * Starts the full workspace application and one Coder supervisor, using explicit paths all the way into Next.
 */
export async function startWorkspaceServer(options: WorkspaceServerOptions): Promise<void> {
    const workspace = options.workspace!;
    const projectPath = workspace.projectPath;
    const projectEnvironment = await readWorkspaceEnvironment(projectPath);
    const executionOptions = {
        ...options,
        environment: projectEnvironment,
        agentName: options.agentName ?? (projectEnvironment.PTBK_HARNESS as RunOptions['agentName']),
        model: options.model ?? projectEnvironment.PTBK_MODEL,
        thinkingLevel: options.thinkingLevel ?? (projectEnvironment.PTBK_THINKING_LEVEL as RunOptions['thinkingLevel']),
    };
    const paths = resolveWorkspaceStoragePaths(projectPath, projectEnvironment);
    await loadWorkspaceExecutionConfiguration(projectPath, {
        harness: executionOptions.agentName,
        model: executionOptions.model,
        thinkingLevel: executionOptions.thinkingLevel,
    });
    console.info(
        `Project: ${projectPath}\nGit root: ${
            workspace.repositoryRoot ?? 'missing (preview only)'
        }\nLocal URL: http://localhost:${options.port}\nStorage: ${paths.registryPath}\nApplication state: ${
            paths.databasePath
        }`,
    );
    if (options.dryRun) {
        const agents = await discoverWorkspaceAgentFiles(projectPath);
        const prompts = listRunnablePrompts(
            await loadPromptFiles(join(projectPath, 'prompts'), { isMissingDirectoryAllowed: true }),
            options.priorityFilter ?? {},
        );
        console.info(
            `Discovered agents: ${
                agents.map((agent) => `${agent.name}${agent.error ? ` (blocked: ${agent.error})` : ''}`).join(', ') ||
                'none; bootstrap would create the default Books'
            }\nReady PRDs: ${prompts.length}\nExecution: preview only\nSynchronization: preview only`,
        );
        return;
    }
    await assertWorkspaceServerPortAvailable(options.port);
    await $assertSufficientFreeDiskSpace(projectPath);
    if (!options.noCommit) {
        await executeWorkspaceGit(workspace.repositoryRoot!, ['var', 'GIT_AUTHOR_IDENT'], {
            ...projectEnvironment,
            ...buildAgentGitEnv(getAgentGitIdentity(projectEnvironment)),
        }).catch(() => {
            throw new NotAllowed(
                'Git author identity is required for automatic commits. Configure user.name and user.email for this repository, then restart.',
            );
        });
    }
    for (const path of [
        paths.registryPath,
        paths.databasePath,
        join(projectPath, '.promptbook', 'logs', '.probe'),
        join(projectPath, '.promptbook', 'agent', '.probe'),
    ])
        await resolveConfinedWorkspacePath(
            projectPath,
            relative(projectPath, path).replace(/\\/gu, '/'),
            '.promptbook',
        );
    const releaseSupervisor = await acquireWorkspaceLease(
        await resolveConfinedWorkspacePath(projectPath, '.promptbook/workspace-server.lock', '.promptbook'),
    );
    let web: Awaited<ReturnType<typeof startAgentsServerWeb>> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let stopTerminalControls: (() => void) | undefined;
    const webState: AgentsServerSupervisorState = { isContinuing: true };
    let supervisor: WorkspaceSupervisor | undefined;
    let activeTick: Promise<void> | undefined;
    let isStopping = false;
    let stopCount = 0;
    const controller = new AbortController();
    const startupController = new AbortController();
    /** Graceful signals stop claims; a second signal cancels only this supervisor's active job. */
    const requestStop = (): void => {
        stopCount += 1;
        isStopping = true;
        webState.isContinuing = false;
        supervisor?.state.updateControl({ isStopping: true });
        if (!web) startupController.abort();
        if (stopCount > 1) controller.abort();
    };
    process.on('SIGINT', requestStop);
    process.on('SIGTERM', requestStop);
    try {
        if (isStopping) return;
        const environment = await createWorkspaceServerEnvironment(projectPath, projectEnvironment);
        await withWorkspaceMutation(workspace, async () => {
            const scope = await captureCoderCommitScope(workspace);
            await initializeCoderProjectConfiguration(projectPath);
            const registryRule =
                '/' +
                relative(projectPath, paths.registryPath)
                    .replace(/\\/gu, '/')
                    .replace(/[\[\]]/gu, '\\$&');
            await ensureCoderGitignoreRules(projectPath, [registryRule, registryRule + '-*']);
            if (!options.noCommit) {
                const changed = await resolveCoderCommitScopePaths(scope);
                const safe = changed.filter((path) => !scope.snapshotBeforeOperation.changedFileHashes.has(path));
                if (safe.length)
                    await commitChanges('Initialize Promptbook workspace artifacts', {
                        projectPath: workspace.repositoryRoot,
                        relevantPaths: safe,
                        environment: projectEnvironment,
                    });
            }
        });
        const state = new WorkspaceState(paths.databasePath);
        state.updateControl({ isStopping: false, ...(options.isPaused ? { isPaused: true } : {}) });
        const client = new LocalSqliteSupabaseClient((tableName) => ({
            database: $provideSqliteDatabaseAtPath(tableName.startsWith('_') ? paths.registryPath : paths.databasePath),
            localTableName: tableName,
        })) as unknown as SupabaseClient;
        const collection = new AgentCollectionInWorkspace(workspace, client, state, '', undefined, projectEnvironment);
        await collection.recoverMutations();
        const synchronization = new WorkspaceGitSynchronization(workspace, state, executionOptions);
        await synchronization.initialize();
        supervisor = new WorkspaceSupervisor(
            { ...executionOptions, signal: controller.signal },
            collection,
            state,
            synchronization,
        );
        const agents = await collection.listWorkspaceAgents();
        console.info(
            `Discovered agents: ${agents
                .map((agent) => `${agent.name}${agent.error ? ' (blocked)' : ''}`)
                .join(', ')}\nExecution: ${
                state.getControl().isPaused ? 'paused' : 'automatic; unavailable targets/harnesses are shown as blocked'
            }\nSynchronization: ${state.getControl().synchronization} ${
                state.getControl().reason ?? ''
            }\nAdmin sign-in: use existing configured credentials or the private ${join(
                projectPath,
                WORKSPACE_SERVER_SECRETS_PATH,
            )} file.`,
        );
        const runtimePaths = await resolveAgentsServerRuntimePaths(projectPath, {
            agentRootPath: join(projectPath, '.promptbook', 'chat-sessions'),
            logDirectoryPath: join(projectPath, '.promptbook', 'logs'),
        });
        const childEnvironment = createAgentsServerChildEnvironment(options.port, runtimePaths.agentRootPath, {
            launchWorkingDirectory: projectPath,
            environment: {
                ...environment,
                PTBK_ALLOW_CREDITS: String(options.allowCredits),
                PTBK_AGENTS_SERVER_SQLITE_PATH: paths.registryPath,
                PTBK_AGENTS_SERVER_REPOSITORY_ROOT: workspace.repositoryRoot,
                PTBK_HARNESS: options.agentName ?? environment.PTBK_HARNESS,
                PTBK_MODEL: options.model ?? environment.PTBK_MODEL,
                PTBK_THINKING_LEVEL: options.thinkingLevel ?? environment.PTBK_THINKING_LEVEL,
            },
        });
        web = await startAgentsServerWeb({
            startOptions: { port: options.port, nextRuntimeMode: 'start', isBuildForced: options.isBuildForced },
            runtimePaths,
            childEnvironment,
            state: webState,
            signal: startupController.signal,
        });
        if (isStopping) return;
        const terminal = createWorkspaceTerminal(
            state,
            { ...options, serverUrl: `http://localhost:${options.port}` },
            requestStop,
        );
        supervisor.terminalUi = terminal.ui;
        stopTerminalControls = terminal.stop;

        /** Schedules a tick only when the previous one settled; idle polling performs no model calls. */
        const tick = (): void => {
            if (activeTick || isStopping || !webState.isContinuing) return;
            activeTick = supervisor!.tick().finally(() => {
                activeTick = undefined;
            });
        };
        tick();
        interval = setInterval(tick, 2_000);
        while (!isStopping && webState.isContinuing && !state.getControl().isStopping)
            await new Promise<void>((done) => setTimeout(done, 250));
        state.updateControl({ isStopping: true });
        clearInterval(interval);
        if (!webState.isContinuing && !isStopping) controller.abort();
        await activeTick;
        if (!isStopping && webState.nextExit) assertNextServerStillRunning(webState);
    } finally {
        isStopping = true;
        if (interval) clearInterval(interval);
        controller.abort();
        await activeTick;
        stopTerminalControls?.();
        process.off('SIGINT', requestStop);
        process.off('SIGTERM', requestStop);
        await web?.stop();
        await releaseSupervisor();
        $closeAgentsServerSqliteDatabases([paths.registryPath, paths.databasePath]);
    }
}

/** Detects listening conflicts before bootstrap, database creation, build or job ownership. */
export async function assertWorkspaceServerPortAvailable(port: number_port): Promise<void> {
    await new Promise<void>((done, reject) => {
        const server = createServer();
        server.once('error', (error) =>
            reject(
                new NotAllowed(
                    `Cannot listen on http://localhost:${port}: ${error.message}. Choose another --port or stop the process which owns it.`,
                ),
            ),
        );
        server.listen(port, '127.0.0.1', () => server.close(() => done()));
    });
}

// Note: [🟡] Workspace startup is only published in `@promptbook/cli`.
