import {
    AGENT_PREPARATION_FAILURE_BACKOFF_BASE_MS,
    AGENT_PREPARATION_FAILURE_BACKOFF_MAX_MS,
} from './agentPreparationConstants';

/**
 * Normalizes an optional table prefix to a stable non-null value.
 *
 * @private function of agentPreparation
 */
export function normalizeAgentPreparationTablePrefix(tablePrefix: string | null | undefined): string {
    return typeof tablePrefix === 'string' ? tablePrefix : '';
}

/**
 * Sleeps for a short time in wait loops.
 *
 * @private function of agentPreparation
 */
export async function sleepForAgentPreparation(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Returns true when the current runtime should avoid starting long-lived worker intervals.
 *
 * @private function of agentPreparation
 */
export function shouldDisableAgentPreparationBackgroundWorkerLoop(): boolean {
    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    if (typeof process.env.JEST_WORKER_ID !== 'undefined') {
        return true;
    }

    return false;
}

/**
 * Resolves whether one error should be retried during the same processing attempt.
 *
 * @private function of agentPreparation
 */
export function isRetryableAgentPreparationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('not found')) {
        return false;
    }

    if (message.includes('invalid') || message.includes('validation')) {
        return false;
    }

    return true;
}

/**
 * Computes the next retry backoff delay from the number of failed runs.
 *
 * @private function of agentPreparation
 */
export function resolveAgentPreparationFailureBackoffMs(retryCount: number): number {
    const normalizedRetryCount = Math.max(1, retryCount);
    const exponentialDelay = AGENT_PREPARATION_FAILURE_BACKOFF_BASE_MS * Math.pow(2, normalizedRetryCount - 1);
    return Math.min(exponentialDelay, AGENT_PREPARATION_FAILURE_BACKOFF_MAX_MS);
}

/**
 * Extracts the table prefix from AgentCollectionInSupabase-like objects.
 */
export function resolveAgentCollectionTablePrefix(agentCollection: unknown): string {
    const candidate = (
        agentCollection as {
            options?: {
                tablePrefix?: string | null;
            };
        }
    )?.options?.tablePrefix;

    return normalizeAgentPreparationTablePrefix(candidate);
}
