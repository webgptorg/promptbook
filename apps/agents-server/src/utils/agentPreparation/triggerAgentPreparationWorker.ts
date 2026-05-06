import { resolveAgentPreparationWorkerInternalToken } from './resolveAgentPreparationWorkerInternalToken';

/**
 * Schedules one best-effort internal worker invocation for agent preparation.
 */
export async function triggerAgentPreparationWorker(options: {
    origin: string;
    tablePrefix?: string;
}): Promise<void> {
    const workerUrl = new URL('/api/internal/agent-preparation/run', ensureTrailingSlashlessOrigin(options.origin));
    const response = await fetch(workerUrl, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-preparation-worker-token': resolveAgentPreparationWorkerInternalToken(),
        },
        body: JSON.stringify(
            options.tablePrefix
                ? {
                      tablePrefix: options.tablePrefix,
                  }
                : {},
        ),
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to trigger agent preparation worker: ${response.status} ${response.statusText}`);
    }
}

/**
 * Normalizes origin input so worker URLs are concatenated safely.
 *
 * @private function of `agentPreparation`
 */
function ensureTrailingSlashlessOrigin(origin: string): string {
    return origin.replace(/\/+$/g, '');
}
