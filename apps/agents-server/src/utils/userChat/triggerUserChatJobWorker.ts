import { resolveUserChatWorkerInternalToken } from './resolveUserChatWorkerInternalToken';

/**
 * Schedules one best-effort internal worker invocation for durable chat jobs.
 */
export async function triggerUserChatJobWorker(options: {
    origin: string;
    preferredJobId?: string;
}): Promise<void> {
    const workerUrl = new URL('/api/internal/user-chat-jobs/run', ensureTrailingSlashlessOrigin(options.origin));
    const response = await fetch(workerUrl, {
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
    });

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
