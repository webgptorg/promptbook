import type { ChildProcess } from 'child_process';
import { mkdir } from 'fs/promises';
import { runMultipleAgentMessages } from '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages';
import { withCurrentWorkingDirectory } from '../../../../scripts/run-agent-messages/main/withCurrentWorkingDirectory';
import { createAgentsServerChildEnvironment } from './startAgentsServer/AgentsServerChildEnvironment';
import {
    closeAgentsServerLogStreams,
    createAgentsServerLogStreams,
    logRunnerEvent,
} from './startAgentsServer/AgentsServerLogStreams';
import { resolveAgentsServerRuntimePaths } from './startAgentsServer/AgentsServerRuntimePaths';
import {
    addUiOutput,
    assertNextServerStillRunning,
    type AgentsServerSupervisorState,
} from './startAgentsServer/AgentsServerSupervisorState';
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
    StartAgentsServerOptions,
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

        await withCurrentWorkingDirectory(runtimePaths.agentRootPath, async () => {
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

// Note: [🟡] Code for CLI runtime [startAgentsServer](src/cli/cli-commands/agents-server/startAgentsServer.ts) should never be published outside of `@promptbook/cli`
