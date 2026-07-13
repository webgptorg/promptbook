/**
 * Callback called before each short sleep while waiting for a wall-clock deadline.
 */
export type WorldTimeDeadlineTick = (remainingDurationMs: number) => void | Promise<void>;

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
}): Promise<void> {
    const { deadlineTimeMs, pollIntervalMs, onTick } = options;
    const normalizedPollIntervalMs = Math.max(MINIMUM_WORLD_TIME_WAIT_POLL_INTERVAL_MS, pollIntervalMs);

    while (true) {
        const remainingDurationMs = getRemainingDurationMs(deadlineTimeMs);

        if (remainingDurationMs <= 0) {
            return;
        }

        await onTick?.(remainingDurationMs);

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

/**
 * Waits for one short polling interval.
 */
async function waitForMilliseconds(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}
