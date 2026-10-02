import {
    beginSkippableWait,
    finishSkippableWait,
    shouldSkipCurrentWait,
    waitForSkippableMilliseconds,
} from './waitForPause';
import { waitUntilWorldTimeDeadline, type WorldTimeDeadlineTick } from './waitUntilWorldTimeDeadline';

/** Workspace controls are polled separately from the less frequent countdown display. */
const WORKSPACE_WAIT_CONTROL_POLL_INTERVAL_MS = 250;

/**
 * Waits until one wall-clock deadline has passed, or until the user skips the wait with the `S` control.
 *
 * This is the single way `ptbk coder` waits for a deadline the user is allowed to cut short, so every
 * wait which shows the `S  Skip current waiting` control really reacts to it: the pacing waits between
 * prompts, the cool-down after an error, and the harness session-limit waits.
 *
 * @private internal utility of `ptbk coder` wait handling
 */
export async function waitForSkippableWorldTimeDeadline(options: {
    readonly deadlineTimeMs: number;
    readonly pollIntervalMs: number;
    readonly onTick?: WorldTimeDeadlineTick;
    readonly signal?: AbortSignal;
    readonly takeSkipWaitingRequest?: () => boolean;
}): Promise<void> {
    const { deadlineTimeMs, pollIntervalMs, onTick } = options;
    if (options.takeSkipWaitingRequest || options.signal) {
        let nextDisplayAt = 0;
        await waitUntilWorldTimeDeadline({
            deadlineTimeMs,
            pollIntervalMs: Math.min(pollIntervalMs, WORKSPACE_WAIT_CONTROL_POLL_INTERVAL_MS),
            signal: options.signal,
            shouldStopWaiting: options.takeSkipWaitingRequest,
            onTick: (remainingDurationMs) => {
                if (Date.now() < nextDisplayAt) return;
                nextDisplayAt = Date.now() + pollIntervalMs;
                return onTick?.(remainingDurationMs);
            },
        });
        return;
    }
    const waitToken = beginSkippableWait();

    try {
        await waitUntilWorldTimeDeadline({
            deadlineTimeMs,
            pollIntervalMs,
            onTick,
            shouldStopWaiting: () => shouldSkipCurrentWait(waitToken),
            waitForMilliseconds: (waitDurationMs) => waitForSkippableMilliseconds(waitToken, waitDurationMs),
        });
    } finally {
        finishSkippableWait(waitToken);
    }
}
