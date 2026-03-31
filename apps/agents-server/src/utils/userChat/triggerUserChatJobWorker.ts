import { resolveUserChatWorkerInternalToken } from './resolveUserChatWorkerInternalToken';

/**
 * Timeout for the HTTP worker trigger request.
 *
 * Prevents the trigger call from hanging indefinitely and blocking the stream's
 * `isWorkerWakeInFlight` flag or the `after()` continuation.
 *
 * @private function of `triggerUserChatJobWorker`
 */
const TRIGGER_USER_CHAT_JOB_WORKER_TIMEOUT_MS = 30_000;

/**
 * Schedules one best-effort internal worker invocation for durable chat jobs.
 */
export async function triggerUserChatJobWorker(options: { origin: string; preferredJobId?: string }): Promise<void> {
    const workerUrl = new URL('/api/internal/user-chat-jobs/run', ensureTrailingSlashlessOrigin(options.origin));
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), TRIGGER_USER_CHAT_JOB_WORKER_TIMEOUT_MS);

    try {
        const response = await fetch(workerUrl, {
            method: 'POST',
            cache: 'no-store',
            signal: abortController.signal,
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
        });

        if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to trigger user chat worker: ${response.status} ${response.statusText}`);
        }
    } finally {
        clearTimeout(timeoutId);
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
