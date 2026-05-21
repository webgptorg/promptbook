import { spawn, type ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import { createWriteStream, type WriteStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { ThinkingLevel } from '../coder/ThinkingLevel';
import type { PromptRunnerAgentName } from '../common/promptRunnerCliOptions';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { number_port } from '../../../types/number_positive';
import { resolvePromptbookTemporaryPath } from '../../../utils/filesystem/promptbookTemporaryPath';
import type { AgentRunOptions } from '../../../../scripts/run-agent-messages/AgentRunOptions';
import { runMultipleAgentMessages } from '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages';
import { withCurrentWorkingDirectory } from '../../../../scripts/run-agent-messages/main/withCurrentWorkingDirectory';
import type { CoderRunUiHandle } from '../../../../scripts/run-codex-prompts/ui/renderCoderRunUi';

/**
 * Local worker-pump delay while the Agents Server foreground process stays active.
 *
 * @private internal constant of `ptbk agents-server`
 */
const USER_CHAT_JOB_WORKER_POLL_INTERVAL_MS = 2_000;

/**
 * HTTP status used by an idle internal worker tick with no job to process.
 *
 * @private internal constant of `ptbk agents-server`
 */
const HTTP_NO_CONTENT_STATUS_CODE = 204;

/**
 * Name of the local Agents Server log folder relative to the launch working directory.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_LOG_DIRECTORY_NAME = 'logs';

/**
 * Public local agent-root environment name consumed by the Agents Server app.
 *
 * @private internal constant of `ptbk agents-server`
 */
const PTBK_AGENTS_SERVER_AGENT_ROOT_ENV = 'PTBK_AGENTS_SERVER_AGENT_ROOT';

/**
 * Options required to start the foreground Agents Server service group.
 *
 * @private internal type of `ptbk agents-server`
 */
export type StartAgentsServerOptions = {
    readonly port: number_port;
    readonly agentName: PromptRunnerAgentName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly allowCredits: boolean;
};

/**
 * Captures foreground file locations for one Agents Server launch.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerRuntimePaths = {
    readonly launchWorkingDirectory: string;
    readonly appPath: string;
    readonly agentRootPath: string;
    readonly logDirectoryPath: string;
    readonly nextLogPath: string;
    readonly runnerLogPath: string;
};

/**
 * Logger handles kept open for the foreground Agents Server lifetime.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerLogStreams = {
    readonly next: WriteStream;
    readonly runner: WriteStream;
};

/**
 * Mutable supervisor state shared with child-process and watcher callbacks.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerSupervisorState = {
    isContinuing: boolean;
    uiHandle?: CoderRunUiHandle;
    nextExit?: {
        code: number | null;
        signal: NodeJS.Signals | null;
    };
};

/**
 * Starts the Agents Server web app and local coding-agent queue workers in the foreground.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function startAgentsServer(options: StartAgentsServerOptions): Promise<void> {
    const runtimePaths = await resolveAgentsServerRuntimePaths();
    await Promise.all([
        mkdir(runtimePaths.agentRootPath, { recursive: true }),
        mkdir(runtimePaths.logDirectoryPath, { recursive: true }),
    ]);

    const logStreams = createAgentsServerLogStreams(runtimePaths);
    const state: AgentsServerSupervisorState = { isContinuing: true };
    const childEnvironment = createAgentsServerChildEnvironment(options.port, runtimePaths.agentRootPath);
    let nextServerProcess: ChildProcess | undefined;
    let stopUserChatJobWorkerPump: (() => void) | undefined;

    logRunnerEvent(logStreams.runner, `Launching from ${runtimePaths.launchWorkingDirectory}.`);
    logRunnerEvent(logStreams.runner, `Agent folders: ${runtimePaths.agentRootPath}.`);
    logRunnerEvent(logStreams.runner, `Agents Server URL: http://localhost:${options.port}.`);

    const processExitHandler = (): void => {
        stopChildProcess(nextServerProcess);
    };
    process.once('exit', processExitHandler);

    try {
        const nextCliPath = resolveNextCliPath();
        await runNextBuild({
            nextCliPath,
            runtimePaths,
            childEnvironment,
            logStreams,
            state,
        });

        nextServerProcess = startNextServer({
            nextCliPath,
            options,
            runtimePaths,
            childEnvironment,
            logStreams,
            state,
        });
        stopUserChatJobWorkerPump = startUserChatJobWorkerPump({
            port: options.port,
            environment: childEnvironment,
            logStreams,
            state,
        });

        await withCurrentWorkingDirectory(runtimePaths.agentRootPath, async () => {
            await runMultipleAgentMessages(createLocalAgentRunOptions(options), {
                shouldContinue: () => state.isContinuing,
                watchErrorLogDirectoryPath: runtimePaths.logDirectoryPath,
                onUiInitialized: (uiHandle) => {
                    state.uiHandle = uiHandle;
                    addUiOutput(
                        state,
                        `Agents Server running at http://localhost:${options.port}. Next logs: ${runtimePaths.nextLogPath}`,
                    );
                },
            });
        });

        assertNextServerStillRunning(state);
    } finally {
        state.isContinuing = false;
        stopUserChatJobWorkerPump?.();
        stopChildProcess(nextServerProcess);
        process.off('exit', processExitHandler);
        closeAgentsServerLogStreams(logStreams);
    }
}

/**
 * Resolves local app, agent-root, and log paths for one foreground launch.
 */
async function resolveAgentsServerRuntimePaths(): Promise<AgentsServerRuntimePaths> {
    const launchWorkingDirectory = process.cwd();
    const appPath = await resolveAgentsServerAppPath();
    const logDirectoryPath = join(launchWorkingDirectory, AGENTS_SERVER_LOG_DIRECTORY_NAME);

    return {
        launchWorkingDirectory,
        appPath,
        agentRootPath: resolvePromptbookTemporaryPath(launchWorkingDirectory, 'agents-server', 'agents'),
        logDirectoryPath,
        nextLogPath: join(logDirectoryPath, 'agents-server-next.log'),
        runnerLogPath: join(logDirectoryPath, 'agents-server-runner.log'),
    };
}

/**
 * Finds the Agents Server app in a source checkout or the generated CLI package.
 */
async function resolveAgentsServerAppPath(): Promise<string> {
    const candidates = [
        join(process.cwd(), 'apps', 'agents-server'),
        join(__dirname, '..', '..', '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', 'apps', 'agents-server'),
    ];

    for (const candidate of candidates) {
        if (await isAgentsServerAppPath(candidate)) {
            return candidate;
        }
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot find the bundled Agents Server app.

            Checked:
            ${candidates.map((candidate) => `- \`${candidate}\``).join('\n')}
        `),
    );
}

/**
 * Returns true when one folder contains the Next Agents Server app marker files.
 */
async function isAgentsServerAppPath(candidate: string): Promise<boolean> {
    try {
        const [packageStats, nextConfigStats] = await Promise.all([
            stat(join(candidate, 'package.json')),
            stat(join(candidate, 'next.config.ts')),
        ]);

        return packageStats.isFile() && nextConfigStats.isFile();
    } catch {
        return false;
    }
}

/**
 * Resolves the Next CLI module installed alongside the Promptbook CLI.
 */
function resolveNextCliPath(): string {
    try {
        return require.resolve('next/dist/bin/next');
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                Cannot start Agents Server because the \`next\` package is unavailable.

                Reinstall \`ptbk\` so the CLI package contains the Agents Server runtime dependencies.
            `),
        );
    }
}

/**
 * Runs a production Next build before the long-running local server process starts.
 */
async function runNextBuild(options: {
    readonly nextCliPath: string;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: NodeJS.ProcessEnv;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): Promise<void> {
    logRunnerEvent(options.logStreams.runner, 'Building the Agents Server Next app.');

    await runLoggedChildProcess({
        label: 'next-build',
        command: process.execPath,
        args: [options.nextCliPath, 'build'],
        cwd: options.runtimePaths.appPath,
        environment: options.childEnvironment,
        logStream: options.logStreams.next,
        state: options.state,
    });
}

/**
 * Starts the production Next server and wires its logs into the foreground dashboard.
 */
function startNextServer(options: {
    readonly nextCliPath: string;
    readonly options: StartAgentsServerOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: NodeJS.ProcessEnv;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): ChildProcess {
    logRunnerEvent(options.logStreams.runner, 'Starting the Agents Server Next process.');

    const commandProcess = spawn(
        process.execPath,
        [options.nextCliPath, 'start', '--port', String(options.options.port)],
        {
            cwd: options.runtimePaths.appPath,
            env: options.childEnvironment,
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );

    bindChildOutput(commandProcess, {
        label: 'next',
        logStream: options.logStreams.next,
        state: options.state,
    });

    commandProcess.once('exit', (code, signal) => {
        options.state.nextExit = { code, signal };
        options.state.isContinuing = false;
        logRunnerEvent(
            options.logStreams.runner,
            `Agents Server Next process exited with code ${String(code)} and signal ${String(signal)}.`,
        );
    });

    commandProcess.once('error', (error) => {
        options.state.isContinuing = false;
        logRunnerEvent(options.logStreams.runner, `Agents Server Next process failed: ${error.message}`);
        addUiError(options.state, error.message);
    });

    return commandProcess;
}

/**
 * Runs one finite child process while preserving its logs and forwarding output to the terminal.
 */
async function runLoggedChildProcess(options: {
    readonly label: string;
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly logStream: WriteStream;
    readonly state: AgentsServerSupervisorState;
}): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const commandProcess = spawn(options.command, [...options.args], {
            cwd: options.cwd,
            env: options.environment,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        bindChildOutput(commandProcess, {
            label: options.label,
            logStream: options.logStream,
            state: options.state,
        });

        commandProcess.once('error', reject);
        commandProcess.once('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`${options.label} exited with code ${String(code)}.`));
        });
    });
}

/**
 * Connects child stdout/stderr to the persisted Next log and visible terminal output.
 */
function bindChildOutput(
    commandProcess: ChildProcess,
    options: {
        readonly label: string;
        readonly logStream: WriteStream;
        readonly state: AgentsServerSupervisorState;
    },
): void {
    commandProcess.stdout?.on('data', (chunk) => {
        forwardChildOutput(chunk.toString(), options);
    });
    commandProcess.stderr?.on('data', (chunk) => {
        forwardChildOutput(chunk.toString(), options);
    });
}

/**
 * Persists one child output chunk and forwards readable lines into UI or plain output.
 */
function forwardChildOutput(
    chunk: string,
    options: {
        readonly label: string;
        readonly logStream: WriteStream;
        readonly state: AgentsServerSupervisorState;
    },
): void {
    options.logStream.write(chunk);

    const visibleLines = chunk
        .split(/\r?\n/gu)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);

    for (const line of visibleLines) {
        const labeledLine = `[${options.label}] ${line}`;
        if (options.state.uiHandle) {
            addUiOutput(options.state, labeledLine);
        } else {
            process.stdout.write(`${labeledLine}\n`);
        }
    }
}

/**
 * Creates the subprocess environment for Next and its internal local runner bridge.
 */
function createAgentsServerChildEnvironment(port: number_port, agentRootPath: string): NodeJS.ProcessEnv {
    return {
        ...process.env,
        PORT: String(port),
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${port}`,
        [PTBK_AGENTS_SERVER_AGENT_ROOT_ENV]: agentRootPath,
    };
}

/**
 * Creates local no-git agent runner options for folders managed by the Agents Server database.
 */
function createLocalAgentRunOptions(options: StartAgentsServerOptions): AgentRunOptions {
    return {
        agentName: options.agentName,
        model: options.model,
        noUi: options.noUi,
        thinkingLevel: options.thinkingLevel,
        noCommit: true,
        ignoreGitChanges: true,
        normalizeLineEndings: false,
        allowCredits: options.allowCredits,
        autoPush: false,
        autoPull: false,
        autoClone: false,
    };
}

/**
 * Starts periodic internal worker calls that queue and reconcile local message-folder jobs.
 */
function startUserChatJobWorkerPump(options: {
    readonly port: number_port;
    readonly environment: NodeJS.ProcessEnv;
    readonly logStreams: AgentsServerLogStreams;
    readonly state: AgentsServerSupervisorState;
}): () => void {
    let isTickRunning = false;
    const interval = setInterval(() => {
        if (!options.state.isContinuing || isTickRunning) {
            return;
        }

        isTickRunning = true;
        triggerUserChatJobWorkerTick(options)
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                logRunnerEvent(options.logStreams.runner, `User chat worker tick failed: ${message}`);
                addUiError(options.state, message);
            })
            .finally(() => {
                isTickRunning = false;
            });
    }, USER_CHAT_JOB_WORKER_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
}

/**
 * Calls one internal local job worker tick over the running Next app.
 */
async function triggerUserChatJobWorkerTick(options: {
    readonly port: number_port;
    readonly environment: NodeJS.ProcessEnv;
}): Promise<void> {
    const response = await fetch(`http://localhost:${options.port}/api/internal/user-chat-jobs/run`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'x-user-chat-worker-token': resolveUserChatWorkerInternalToken(options.environment),
        },
        body: '{}',
    });

    if (!response.ok && response.status !== HTTP_NO_CONTENT_STATUS_CODE) {
        throw new Error(`Internal user chat worker returned ${response.status} ${response.statusText}.`);
    }
}

/**
 * Mirrors Agents Server worker-token derivation for internal foreground worker calls.
 */
function resolveUserChatWorkerInternalToken(environment: NodeJS.ProcessEnv): string {
    const entropySource =
        environment.SUPABASE_SERVICE_ROLE_KEY ||
        environment.ADMIN_PASSWORD ||
        environment.NEXT_PUBLIC_SITE_URL ||
        'promptbook-user-chat-worker';

    return createHash('sha256').update(`user-chat-worker:${entropySource}`).digest('hex');
}

/**
 * Creates file streams for service output persisted below `./logs`.
 */
function createAgentsServerLogStreams(runtimePaths: AgentsServerRuntimePaths): AgentsServerLogStreams {
    return {
        next: createWriteStream(runtimePaths.nextLogPath, { flags: 'a' }),
        runner: createWriteStream(runtimePaths.runnerLogPath, { flags: 'a' }),
    };
}

/**
 * Closes all foreground service log streams.
 */
function closeAgentsServerLogStreams(logStreams: AgentsServerLogStreams): void {
    logStreams.next.end();
    logStreams.runner.end();
}

/**
 * Appends one timestamped runner lifecycle event into its persistent log file.
 */
function logRunnerEvent(logStream: WriteStream, event: string): void {
    logStream.write(`[${new Date().toISOString()}] ${event}\n`);
}

/**
 * Adds one Next or worker output line to the rich terminal UI when it is active.
 */
function addUiOutput(state: AgentsServerSupervisorState, output: string): void {
    state.uiHandle?.state.addAgentOutput(output);
}

/**
 * Adds one service error line to the rich terminal UI when it is active.
 */
function addUiError(state: AgentsServerSupervisorState, error: string): void {
    state.uiHandle?.state.addError(error);
}

/**
 * Throws when the server child stopped while the watcher was still expected to be foreground work.
 */
function assertNextServerStillRunning(state: AgentsServerSupervisorState): void {
    if (!state.nextExit) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Agents Server Next process stopped.

            - Exit code: \`${String(state.nextExit.code)}\`
            - Signal: \`${String(state.nextExit.signal)}\`
        `),
    );
}

/**
 * Stops only the child process spawned for the local Next server.
 */
function stopChildProcess(commandProcess: ChildProcess | undefined): void {
    if (!commandProcess || commandProcess.killed) {
        return;
    }

    commandProcess.kill();
}

// Note: [🟡] Code for CLI runtime [startAgentsServer](src/cli/cli-commands/agents-server/startAgentsServer.ts) should never be published outside of `@promptbook/cli`
