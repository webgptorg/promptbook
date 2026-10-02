import { mkdir } from 'fs/promises';
import { runMultipleAgentMessages } from '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages';
import { createAgentsServerChildEnvironment } from './startAgentsServer/AgentsServerChildEnvironment';
import { resolveAgentsServerRuntimePaths } from './startAgentsServer/AgentsServerRuntimePaths';
import type { AgentsServerSupervisorState } from './startAgentsServer/AgentsServerSupervisorState';
import { addUiOutput, assertNextServerStillRunning } from './startAgentsServer/AgentsServerSupervisorState';
import { createLocalAgentRunOptions } from './startAgentsServer/createLocalAgentRunOptions';
import { loadAgentsServerProjectEnvironment } from './startAgentsServer/loadAgentsServerProjectEnvironment';
import type { StartAgentsServerOptions } from './startAgentsServer/StartAgentsServerOptions';
import { startAgentsServerWeb } from './startAgentsServer/startAgentsServerWeb';

export { loadAgentsServerProjectEnvironment } from './startAgentsServer/loadAgentsServerProjectEnvironment';
export type {
    AgentsServerNextRuntimeMode,
    StartAgentsServerOptions,
} from './startAgentsServer/StartAgentsServerOptions';

/**
 * Starts the ordinary database-backed application with its existing local message-folder workers.
 * Workspace startup selects different workers while sharing web preparation, packaging and child lifecycle.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function startAgentsServer(options: StartAgentsServerOptions): Promise<void> {
    const runtimePaths = await resolveAgentsServerRuntimePaths();
    const environment = loadAgentsServerProjectEnvironment(runtimePaths.launchWorkingDirectory);
    await mkdir(runtimePaths.agentRootPath, { recursive: true });
    const state: AgentsServerSupervisorState = { isContinuing: true };
    const controller = new AbortController();
    let stopCount = 0;
    /** Stops claims before waiting for owned workers; a second signal cancels the active subprocesses. */
    const stop = (): void => {
        state.isContinuing = false;
        if (++stopCount > 1) controller.abort();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    let web: Awaited<ReturnType<typeof startAgentsServerWeb>> | undefined;
    try {
        web = await startAgentsServerWeb({
            startOptions: options,
            runtimePaths,
            childEnvironment: createAgentsServerChildEnvironment(options.port, runtimePaths.agentRootPath, {
                environment,
                launchWorkingDirectory: runtimePaths.launchWorkingDirectory,
            }),
            state,
        });
        await runMultipleAgentMessages(
            {
                ...createLocalAgentRunOptions(options, web.limits),
                environment: web.environment,
                signal: controller.signal,
            },
            {
                rootPath: runtimePaths.agentRootPath,
                shouldContinue: () => state.isContinuing,
                watchErrorLogDirectoryPath: runtimePaths.logDirectoryPath,
                onUiInitialized: (uiHandle) => {
                    state.uiHandle = uiHandle;
                    addUiOutput(
                        state,
                        `Agents Server running at http://localhost:${options.port}. Next logs: ${runtimePaths.nextLogPath}`,
                    );
                },
            },
        );
        assertNextServerStillRunning(state);
    } finally {
        state.isContinuing = false;
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        await web?.stop();
    }
}

// Note: [🟡] CLI startup is only published in `@promptbook/cli`.
