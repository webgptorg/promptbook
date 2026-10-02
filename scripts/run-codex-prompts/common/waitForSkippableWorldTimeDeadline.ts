import {
    beginSkippableWait,
    finishSkippableWait,
    shouldSkipCurrentWait,
    waitForSkippableMilliseconds,
} from './waitForPause';
import { waitUntilWorldTimeDeadline, type WorldTimeDeadlineTick } from './waitUntilWorldTimeDeadline';

/**
 * Waits until one wall-clock deadline has passed, or until the user skips the wait with the `S` control.
 *
 * This is the single way `ptbk coder` waits for a deadline the user is allowed to cut short, so every
 * wait which shows the `S  Skip current waiting` control really reacts to it: the pacing waits between
 * prompts, the cool-down after an error, the harness session-limit waits and the server keep-alive poll.
 *
 * @private internal utility of `ptbk coder` wait handling
 */
export async function waitForSkippableWorldTimeDeadline(options: {
    readonly deadlineTimeMs: number;
    readonly pollIntervalMs: number;
    readonly onTick?: WorldTimeDeadlineTick;
}): Promise<void> {
    const { deadlineTimeMs, pollIntervalMs, onTick } = options;
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
