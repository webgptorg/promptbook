import { resolveUserChatWorkerInternalToken } from './resolveUserChatWorkerInternalToken';
import { retryWithBackoff } from '../retryWithBackoff';

/**
 * Number of retries for transient transport failures while waking the durable chat worker.
 */
const USER_CHAT_WORKER_TRIGGER_FETCH_RETRIES = 2;

/**
 * Initial wait before retrying a failed worker wake-up request.
 */
const USER_CHAT_WORKER_TRIGGER_FETCH_INITIAL_DELAY_MS = 250;

/**
 * Maximum wait before retrying a failed worker wake-up request.
 */
const USER_CHAT_WORKER_TRIGGER_FETCH_MAX_DELAY_MS = 1_000;

/**
 * Multiplier used between worker wake-up retry waits.
 */
const USER_CHAT_WORKER_TRIGGER_FETCH_BACKOFF_FACTOR = 2;

/**
 * Randomized extra delay ratio for worker wake-up retry waits.
 */
const USER_CHAT_WORKER_TRIGGER_FETCH_JITTER_RATIO = 0.2;

/**
 * Schedules one best-effort internal worker invocation for durable chat jobs.
 */
export async function triggerUserChatJobWorker(options: { origin: string; preferredJobId?: string }): Promise<void> {
    const workerUrl = new URL('/api/internal/user-chat-jobs/run', ensureTrailingSlashlessOrigin(options.origin));
    const response = (
        await retryWithBackoff(
            async () =>
                await fetch(workerUrl, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-chat-worker-token': resolveUserChatWorkerInternalToken(),
                    },
                    body: JSON.stringify(
                        options.preferredJobId
                            ? {
                                  preferredJobId: options.preferredJobId,
                              }
                            : {},
                    ),
                }),
            {
                retries: USER_CHAT_WORKER_TRIGGER_FETCH_RETRIES,
                initialDelayMs: USER_CHAT_WORKER_TRIGGER_FETCH_INITIAL_DELAY_MS,
                maxDelayMs: USER_CHAT_WORKER_TRIGGER_FETCH_MAX_DELAY_MS,
                backoffFactor: USER_CHAT_WORKER_TRIGGER_FETCH_BACKOFF_FACTOR,
                jitterRatio: USER_CHAT_WORKER_TRIGGER_FETCH_JITTER_RATIO,
            },
        )
    ).value;

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to trigger user chat worker: ${response.status} ${response.statusText}`);
    }
}

/**
 * Normalizes origin input so worker URLs are concatenated safely.
 *
 * @private function of `userChat`
 */
function ensureTrailingSlashlessOrigin(origin: string): string {
    return origin.replace(/\/+$/g, '');
}
