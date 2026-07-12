import type { WriteStream } from 'fs';
import type { number_port } from '../../../../types/number_positive';
import type { AgentsServerChildEnvironment } from './AgentsServerChildEnvironment';
import type { AgentsServerLogStreams } from './AgentsServerLogStreams';
import { logRunnerEvent } from './AgentsServerLogStreams';
import { addUiError, type AgentsServerSupervisorState } from './AgentsServerSupervisorState';
import { createInternalRouteErrorMessage } from './createInternalRouteErrorMessage';
import { readInternalRouteErrorDetails } from './readInternalRouteErrorDetails';

/**
 * Local worker-pump delay while the Agents Server foreground process stays active.
 *
 * @private internal constant of `startAgentsServer`
 */
const USER_CHAT_JOB_WORKER_POLL_INTERVAL_MS = 10_000;

/**
 * Number of identical worker failures suppressed before logging a repeated summary.
 *
 * @private internal constant of `startAgentsServer`
 */
const USER_CHAT_JOB_WORKER_REPEATED_ERROR_LOG_INTERVAL = 10;

/**
 * HTTP status used by an idle internal worker tick with no job to process.
 *
 * @private internal constant of `startAgentsServer`
 */
const HTTP_NO_CONTENT_STATUS_CODE = 204;

/**
 * Starts periodic internal worker calls that queue and reconcile local message-folder jobs.
 *
 * @private internal utility of `startAgentsServer`
 */
export function startUserChatJobWorkerPump(options: {
    readonly port: number_port;
    readonly environment: AgentsServerChildEnvironment;
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
            .then(() => {
                clearUserChatJobWorkerError(options.state);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                reportUserChatJobWorkerError({
                    logStream: options.logStreams.runner,
                    message,
                    state: options.state,
                });
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
    readonly environment: AgentsServerChildEnvironment;
}): Promise<void> {
    const response = await fetch(`http://localhost:${options.port}/api/internal/user-chat-jobs/run`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'x-user-chat-worker-token': options.environment.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN,
        },
        body: '{}',
    });

    if (!response.ok && response.status !== HTTP_NO_CONTENT_STATUS_CODE) {
        const details = await readInternalRouteErrorDetails(response);
        throw new Error(createInternalRouteErrorMessage('user chat worker', response, details));
    }
}

/**
 * Reports worker failures while suppressing identical repeated foreground noise.
 */
function reportUserChatJobWorkerError(options: {
    readonly logStream: WriteStream;
    readonly message: string;
    readonly state: AgentsServerSupervisorState;
}): void {
    const previousError = options.state.lastUserChatJobWorkerError;

    if (previousError?.message === options.message) {
        const repeatCount = previousError.repeatCount + 1;
        options.state.lastUserChatJobWorkerError = {
            message: options.message,
            repeatCount,
        };

        if (repeatCount % USER_CHAT_JOB_WORKER_REPEATED_ERROR_LOG_INTERVAL !== 0) {
            return;
        }

        const repeatedMessage = `User chat worker tick is still failing after ${repeatCount} attempts: ${options.message}`;
        logRunnerEvent(options.logStream, repeatedMessage);
        addUiError(options.state, repeatedMessage);
        return;
    }

    options.state.lastUserChatJobWorkerError = {
        message: options.message,
        repeatCount: 1,
    };
    logRunnerEvent(options.logStream, `User chat worker tick failed: ${options.message}`);
    addUiError(options.state, options.message);
}

/**
 * Resets repeated-error suppression after a successful worker tick.
 */
function clearUserChatJobWorkerError(state: AgentsServerSupervisorState): void {
    state.lastUserChatJobWorkerError = undefined;
}
