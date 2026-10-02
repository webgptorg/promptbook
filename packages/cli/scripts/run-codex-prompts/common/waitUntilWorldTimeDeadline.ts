/**
 * Callback called before each short sleep while waiting for a wall-clock deadline.
 */
export type WorldTimeDeadlineTick = (remainingDurationMs: number) => void | Promise<void>;

/**
 * Callback used to perform one wait segment.
 */
export type WorldTimeDeadlineWait = (durationMs: number) => Promise<void>;

/**
 * Callback that can stop the deadline wait before the wall-clock deadline is reached.
 */
export type WorldTimeDeadlineStopCheck = () => boolean;

/**
 * Minimum timer duration used to avoid a zero-millisecond polling loop.
 */
const MINIMUM_WORLD_TIME_WAIT_POLL_INTERVAL_MS = 1;

/**
 * Waits until one wall-clock deadline has passed.
 *
 * The remaining time is recalculated from `Date.now()` after every poll and after every tick callback.
 * This makes waits elapse while the process is paused at a checkpoint or the computer is asleep.
 *
 * @private internal utility of `ptbk coder` wait handling
 */
export async function waitUntilWorldTimeDeadline(options: {
    readonly deadlineTimeMs: number;
    readonly pollIntervalMs: number;
    readonly onTick?: WorldTimeDeadlineTick;
    readonly shouldStopWaiting?: WorldTimeDeadlineStopCheck;
    readonly waitForMilliseconds?: WorldTimeDeadlineWait;
    readonly signal?: AbortSignal;
}): Promise<void> {
    const { deadlineTimeMs, pollIntervalMs, onTick, shouldStopWaiting } = options;
    const normalizedPollIntervalMs = Math.max(MINIMUM_WORLD_TIME_WAIT_POLL_INTERVAL_MS, pollIntervalMs);
    const waitForMilliseconds =
        options.waitForMilliseconds ?? ((durationMs) => waitForRegularMilliseconds(durationMs, options.signal));

    while (true) {
        options.signal?.throwIfAborted();
        if (shouldStopWaiting?.()) {
            return;
        }

        const remainingDurationMs = getRemainingDurationMs(deadlineTimeMs);

        if (remainingDurationMs <= 0) {
            return;
        }

        await onTick?.(remainingDurationMs);

        if (shouldStopWaiting?.()) {
            return;
        }

        const remainingDurationAfterTickMs = getRemainingDurationMs(deadlineTimeMs);

        if (remainingDurationAfterTickMs <= 0) {
            return;
        }

        await waitForMilliseconds(Math.min(normalizedPollIntervalMs, remainingDurationAfterTickMs));
    }
}

/**
 * Returns the remaining wall-clock duration until a timestamp.
 */
function getRemainingDurationMs(deadlineTimeMs: number): number {
    return Math.max(0, deadlineTimeMs - Date.now());
}

/** Sleeps one segment and promptly releases its timer on invocation-local cancellation. */
async function waitForRegularMilliseconds(durationMs: number, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    await new Promise<void>((done, reject) => {
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            done();
        }, durationMs);
        /** Cancels only this segment, leaving concurrent session waits untouched. */
        const onAbort = (): void => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            reject(signal?.reason);
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
