import { resolveUserChatWorkerInternalToken } from '../userChat/resolveUserChatWorkerInternalToken';

/**
 * Schedules one best-effort internal worker invocation for durable chat timeouts.
 */
export async function triggerUserChatTimeoutWorker(options: { origin: string }): Promise<void> {
    const workerUrl = new URL('/api/internal/user-chat-timeouts/run', ensureTrailingSlashlessOrigin(options.origin));
    const response = await fetch(workerUrl, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'x-user-chat-worker-token': resolveUserChatWorkerInternalToken(),
        },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to trigger user chat timeout worker: ${response.status} ${response.statusText}`);
    }
}

/**
 * Normalizes origin input so worker URLs are concatenated safely.
 *
 * @private internal utility of userChatTimeout
 */
function ensureTrailingSlashlessOrigin(origin: string): string {
    return origin.replace(/\/+$/g, '');
}
