import type { ChildProcess } from 'child_process';
import { mkdir } from 'fs/promises';
import { createAgentsServerLogStreams, closeAgentsServerLogStreams } from './AgentsServerLogStreams';
import type { AgentsServerRuntimePaths } from './AgentsServerRuntimePaths';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerSupervisorState } from './AgentsServerSupervisorState';
import { prepareAgentsServerLaunch } from './prepareAgentsServerLaunch';
import type { AgentsServerWebStartOptions } from './StartAgentsServerOptions';
import { startNextServer } from './startNextServer';
import { waitForLocalAgentRunnerLimits } from './waitForLocalAgentRunnerLimits';
import { startUserChatJobWorkerPump } from './startUserChatJobWorkerPump';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { stopChildProcess } from './stopChildProcess';

/** Maximum wait for the owned web process to exit after SIGTERM. */
const OWNED_WEB_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Leaves time for owned chat heartbeats to cancel and persist before the web process is terminated. */
const WORKSPACE_CHAT_SHUTDOWN_TIMEOUT_MS = 9_000;

/**
 * Starts the actual Agent Server using the common packaged build/runtime preparation and owned child lifecycle.
 * Workers are selected by the caller; this service never launches another Coder CLI or changes the project cwd.
 * @private shared web startup for standalone and workspace Agent Server
 */
export async function startAgentsServerWeb(options: {
    readonly startOptions: AgentsServerWebStartOptions;
    readonly runtimePaths: AgentsServerRuntimePaths;
    readonly childEnvironment: AgentsServerChildEnvironment;
    readonly state: AgentsServerSupervisorState;
    readonly signal?: AbortSignal;
}) {
    await mkdir(options.runtimePaths.logDirectoryPath, { recursive: true });
    const logStreams = createAgentsServerLogStreams(options.runtimePaths);
    let child: ChildProcess | undefined;
    let stopPump: (() => void) | undefined;
    /** Emergency process-exit cleanup targets only the owned Next child. */
    const onExit = (): void => stopChildProcess(child);
    process.once('exit', onExit);
    /** Stops only the service child and closes its owned logs after exit. */
    const stop = async (): Promise<void> => {
        process.off('exit', onExit);
        stopPump?.();
        if (child && child.exitCode === null && child.signalCode === null) {
            if (options.childEnvironment.PTBK_AGENTS_SERVER_WORKSPACE) {
                // Existing chat heartbeats cancel the owned harness tree and flush durable messages/jobs.
                await fetch(`http://127.0.0.1:${options.startOptions.port}/api/internal/workspace/shutdown`, {
                    method: 'POST',
                    headers: {
                        'x-user-chat-worker-token': options.childEnvironment.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
                    },
                    signal: AbortSignal.timeout(WORKSPACE_CHAT_SHUTDOWN_TIMEOUT_MS),
                }).catch(() => undefined);
            }
            const exited = new Promise<void>((done) => child!.once('exit', () => done()));
            child.kill('SIGTERM');
            const timeout = setTimeout(() => {
                if (child?.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
            }, OWNED_WEB_SHUTDOWN_TIMEOUT_MS);
            await exited;
            clearTimeout(timeout);
        }
        closeAgentsServerLogStreams(logStreams);
    };
    try {
        const prepared = await prepareAgentsServerLaunch({ ...options, logStreams });
        if (!options.state.isContinuing)
            throw new NotAllowed('Agent Server startup was stopped before the web process was started.');
        child = startNextServer({
            nextCliPath: prepared.runtimeArtifacts.nextCliPath,
            startOptions: options.startOptions,
            runtimePaths: prepared.runtimePaths,
            childEnvironment: prepared.runtimeChildEnvironment,
            logStreams,
            state: options.state,
        });
        const limits = await waitForLocalAgentRunnerLimits({
            port: options.startOptions.port,
            environment: prepared.runtimeChildEnvironment,
            logStreams,
            state: options.state,
        });
        if (!options.state.isContinuing)
            throw new NotAllowed('The Agent Server web process exited during startup. Inspect its runtime log.');
        stopPump = startUserChatJobWorkerPump({
            port: options.startOptions.port,
            environment: prepared.runtimeChildEnvironment,
            logStreams,
            state: options.state,
        });
        return { child, stop, logStreams, limits, environment: prepared.runtimeChildEnvironment };
    } catch (error) {
        await stop();
        throw error;
    }
}

// Note: [🟡] Shared web startup is only published in `@promptbook/cli`.
