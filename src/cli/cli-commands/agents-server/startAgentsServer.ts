import type { ChildProcess } from 'child_process';
import { mkdir } from 'fs/promises';
import { PTBK_AGENTS_SERVER_URL_ENV, PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV } from '../../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import { runMultipleAgentMessages } from '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages';
import { withCurrentWorkingDirectory } from '../../../../scripts/run-agent-messages/main/withCurrentWorkingDirectory';
import { createAgentsServerChildEnvironment } from './startAgentsServer/AgentsServerChildEnvironment';
import { closeAgentsServerLogStreams, createAgentsServerLogStreams, logRunnerEvent } from './startAgentsServer/AgentsServerLogStreams';
import { resolveAgentsServerRuntimePaths } from './startAgentsServer/AgentsServerRuntimePaths';
import type { AgentsServerSupervisorState } from './startAgentsServer/AgentsServerSupervisorState';
import { addUiOutput, assertNextServerStillRunning } from './startAgentsServer/AgentsServerSupervisorState';
import { createLocalAgentRunOptions } from './startAgentsServer/createLocalAgentRunOptions';
import { loadAgentsServerProjectEnvironment } from './startAgentsServer/loadAgentsServerProjectEnvironment';
import { prepareAgentsServerLaunch } from './startAgentsServer/prepareAgentsServerLaunch';
import type { StartAgentsServerOptions } from './startAgentsServer/StartAgentsServerOptions';
import { startNextServer } from './startAgentsServer/startNextServer';
import { startUserChatJobWorkerPump } from './startAgentsServer/startUserChatJobWorkerPump';
import { stopChildProcess } from './startAgentsServer/stopChildProcess';
import { waitForLocalAgentRunnerLimits } from './startAgentsServer/waitForLocalAgentRunnerLimits';

export { loadAgentsServerProjectEnvironment } from './startAgentsServer/loadAgentsServerProjectEnvironment';
export type {
  AgentsServerNextRuntimeMode,
  StartAgentsServerOptions
} from './startAgentsServer/StartAgentsServerOptions';

/**
 * Starts the Agents Server web app and local coding-agent queue workers in the foreground.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function startAgentsServer(options: StartAgentsServerOptions): Promise<void> {
    const runtimePaths = await resolveAgentsServerRuntimePaths();
    loadAgentsServerProjectEnvironment(runtimePaths.launchWorkingDirectory);
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
        const preparedLaunch = await prepareAgentsServerLaunch({
            childEnvironment,
            logStreams,
            startOptions: options,
            runtimePaths,
            state,
        });

        nextServerProcess = startNextServer({
            nextCliPath: preparedLaunch.runtimeArtifacts.nextCliPath,
            startOptions: options,
            runtimePaths: preparedLaunch.runtimePaths,
            childEnvironment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });
        const localAgentRunnerLimits = await waitForLocalAgentRunnerLimits({
            port: options.port,
            environment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });
        stopUserChatJobWorkerPump = startUserChatJobWorkerPump({
            port: options.port,
            environment: preparedLaunch.runtimeChildEnvironment,
            logStreams,
            state,
        });

        const restoreLocalAgentRunnerEnvironment = applyLocalAgentRunnerInternalEnvironment(
            preparedLaunch.runtimeChildEnvironment,
        );

        await withCurrentWorkingDirectory(runtimePaths.agentRootPath, async () => {
            try {
                await runMultipleAgentMessages(createLocalAgentRunOptions(options, localAgentRunnerLimits), {
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
            } finally {
                restoreLocalAgentRunnerEnvironment();
            }
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
 * Applies internal Agents Server environment variables to local coding-runner subprocesses.
 */
function applyLocalAgentRunnerInternalEnvironment(environment: NodeJS.ProcessEnv): () => void {
    const previousAgentsServerUrl = process.env[PTBK_AGENTS_SERVER_URL_ENV];
    const previousWorkerToken = process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV];

    process.env[PTBK_AGENTS_SERVER_URL_ENV] = environment[PTBK_AGENTS_SERVER_URL_ENV] || '';
    process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV] =
        environment[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV] || '';

    return () => {
        restoreEnvironmentVariable(PTBK_AGENTS_SERVER_URL_ENV, previousAgentsServerUrl);
        restoreEnvironmentVariable(PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV, previousWorkerToken);
    };
}

/**
 * Restores or removes one environment variable.
 */
function restoreEnvironmentVariable(environmentVariableName: string, previousValue: string | undefined): void {
    if (previousValue === undefined) {
        delete process.env[environmentVariableName];
        return;
    }

    process.env[environmentVariableName] = previousValue;
}

// Note: [🟡] Code for CLI runtime [startAgentsServer](src/cli/cli-commands/agents-server/startAgentsServer.ts) should never be published outside of `@promptbook/cli`
