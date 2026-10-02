/**
 * Default progressive delays used for rate-limit retries:
 * 1 minute, 2 minutes, 5 minutes, 10 minutes, and 30 minutes.
 */
export const DEFAULT_PROGRESSIVE_BACKOFF_DELAYS_MS = Object.freeze([
    1 * 60 * 1000,
    2 * 60 * 1000,
    5 * 60 * 1000,
    10 * 60 * 1000,
    30 * 60 * 1000,
]);

/**
 * Options for one progressive backoff counter.
 */
export type ProgressiveBackoffOptions = {
    delaysMs?: readonly number[];
    maxDelayMs?: number;
    jitterRatio?: number;
    random?: () => number;
};

/**
 * Stateful progressive backoff counter with optional jitter and capped maximum delay.
 */
export class ProgressiveBackoff {
    private readonly delaysMs: readonly number[];
    private readonly maxDelayMs: number;
    private readonly jitterRatio: number;
    private readonly random: () => number;
    private failuresSinceSuccess = 0;

    /**
     * Creates one progressive backoff counter.
     */
    public constructor(options: ProgressiveBackoffOptions = {}) {
        this.delaysMs = options.delaysMs ?? DEFAULT_PROGRESSIVE_BACKOFF_DELAYS_MS;
        this.maxDelayMs = Math.max(0, options.maxDelayMs ?? this.delaysMs[this.delaysMs.length - 1] ?? 0);
        this.jitterRatio = Math.max(0, options.jitterRatio ?? 0.1);
        this.random = options.random ?? Math.random;
    }

    /**
     * Number of consecutive failures since the last successful reset.
     */
    public get retryCount(): number {
        return this.failuresSinceSuccess;
    }

    /**
     * Returns the next delay and advances the backoff counter by one failed attempt.
     */
    public nextDelayMs(): number {
        const baseDelayMs = this.resolveBaseDelayMs(this.failuresSinceSuccess);
        this.failuresSinceSuccess++;

        const jitterSpanMs = baseDelayMs * this.jitterRatio;
        const jitterOffsetMs = (this.random() * 2 - 1) * jitterSpanMs;
        const withJitterMs = Math.round(baseDelayMs + jitterOffsetMs);

        return Math.max(0, Math.min(this.maxDelayMs, withJitterMs));
    }

    /**
     * Resets backoff state after one successful call.
     */
    public reset(): void {
        this.failuresSinceSuccess = 0;
    }

    /**
     * Resolves the non-jittered delay for the given retry index.
     */
    private resolveBaseDelayMs(retryIndex: number): number {
        if (this.delaysMs.length === 0) {
            return 0;
        }

        const safeRetryIndex = Math.max(0, retryIndex);
        const scheduleIndex = Math.min(safeRetryIndex, this.delaysMs.length - 1);
        const scheduledDelayMs = this.delaysMs[scheduleIndex] ?? 0;
        return Math.max(0, Math.min(this.maxDelayMs, scheduledDelayMs));
    }
}
