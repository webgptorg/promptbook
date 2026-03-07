/**
 * Callback invoked before one retry wait.
 *
 * @private utility for Agents Server runtime retries
 */
export type RetryWithBackoffAttempt = {
    /**
     * Number of failed attempts completed so far (1-based).
     */
    readonly attempt: number;
    /**
     * Configured number of retries after the first attempt.
     */
    readonly retries: number;
    /**
     * Delay scheduled before the next attempt.
     */
    readonly delayMs: number;
    /**
     * Error from the attempt that just failed.
     */
    readonly error: unknown;
};

/**
 * Result metadata returned from a retry operation.
 *
 * @private utility for Agents Server runtime retries
 */
export type RetryWithBackoffResult<TValue> = {
    /**
     * Value returned from the successful attempt.
     */
    readonly value: TValue;
    /**
     * Number of attempts used (first try + retries).
     */
    readonly attempts: number;
    /**
     * Total elapsed time in milliseconds across attempts and waits.
     */
    readonly durationMs: number;
};

/**
 * Configurable options for retrying one asynchronous operation with backoff.
 *
 * @private utility for Agents Server runtime retries
 */
export type RetryWithBackoffOptions = {
    /**
     * Number of retries after the initial attempt.
     */
    readonly retries: number;
    /**
     * Initial backoff delay before retry #1.
     */
    readonly initialDelayMs: number;
    /**
     * Upper bound for one backoff delay.
     */
    readonly maxDelayMs: number;
    /**
     * Multiplier used for exponential growth between retry delays.
     */
    readonly backoffFactor: number;
    /**
     * Randomized extra delay ratio relative to the exponential delay.
     */
    readonly jitterRatio: number;
    /**
     * Optional cancellation signal.
     */
    readonly signal?: AbortSignal;
    /**
     * Optional predicate deciding if the thrown error can be retried.
     */
    readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
    /**
     * Optional callback called before waiting for one retry.
     */
    readonly onRetry?: (attempt: RetryWithBackoffAttempt) => void;
    /**
     * Random provider used for jitter; defaults to `Math.random`.
     */
    readonly random?: () => number;
    /**
     * Sleep implementation used during backoff; defaults to an abort-aware timeout.
     */
    readonly sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

/**
 * Creates one standard abort error for cancelled retry loops.
 *
 * @private utility for Agents Server runtime retries
 */
function createAbortError(): Error {
    const error = new Error('Operation was aborted.');
    error.name = 'AbortError';
    return error;
}

/**
 * Throws when the supplied signal is already aborted.
 *
 * @private utility for Agents Server runtime retries
 */
function assertNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw createAbortError();
    }
}

/**
 * Waits for a duration while respecting cancellation.
 *
 * @private utility for Agents Server runtime retries
 */
async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
    if (delayMs <= 0) {
        assertNotAborted(signal);
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, delayMs);

        const onAbort = () => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            reject(createAbortError());
        };

        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * Resolves the retry wait duration for one failed attempt.
 *
 * @private utility for Agents Server runtime retries
 */
function resolveBackoffDelayMs(options: {
    readonly attempt: number;
    readonly initialDelayMs: number;
    readonly maxDelayMs: number;
    readonly backoffFactor: number;
    readonly jitterRatio: number;
    readonly random: () => number;
}): number {
    const exponentialDelay =
        options.initialDelayMs * Math.pow(options.backoffFactor, Math.max(0, options.attempt - 1));
    const boundedDelay = Math.min(exponentialDelay, options.maxDelayMs);
    const jitterDelay = boundedDelay * options.jitterRatio * Math.max(0, options.random());

    return Math.max(0, Math.round(boundedDelay + jitterDelay));
}

/**
 * Retries one async operation with exponential backoff and jitter.
 *
 * @private utility for Agents Server runtime retries
 */
export async function retryWithBackoff<TValue>(
    operation: (attempt: number) => Promise<TValue>,
    options: RetryWithBackoffOptions,
): Promise<RetryWithBackoffResult<TValue>> {
    const startedAt = Date.now();
    const totalAttempts = Math.max(1, options.retries + 1);
    const random = options.random ?? Math.random;
    const sleep = options.sleep ?? sleepWithAbort;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        assertNotAborted(options.signal);

        try {
            const value = await operation(attempt);
            return {
                value,
                attempts: attempt,
                durationMs: Date.now() - startedAt,
            };
        } catch (error) {
            const isLastAttempt = attempt >= totalAttempts;
            const isRetryable = options.shouldRetry ? options.shouldRetry(error, attempt) : true;

            if (isLastAttempt || !isRetryable) {
                throw error;
            }

            const delayMs = resolveBackoffDelayMs({
                attempt,
                initialDelayMs: options.initialDelayMs,
                maxDelayMs: options.maxDelayMs,
                backoffFactor: options.backoffFactor,
                jitterRatio: options.jitterRatio,
                random,
            });

            options.onRetry?.({
                attempt,
                retries: options.retries,
                delayMs,
                error,
            });

            await sleep(delayMs, options.signal);
        }
    }

    throw new Error('Retry loop exited unexpectedly.');
}
