import {
    beginSkippableWait,
    finishSkippableWait,
    shouldSkipCurrentWait,
    waitForSkippableMilliseconds,
} from './waitForPause';
import { waitUntilWorldTimeDeadline, type WorldTimeDeadlineTick } from './waitUntilWorldTimeDeadline';
import { setTimeout as waitForTimeout } from 'timers/promises';

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
    readonly signal?: AbortSignal;
}): Promise<void> {
    const { deadlineTimeMs, pollIntervalMs, onTick } = options;
    if (options.signal) {
        // Finite jobs own cancellation and do not register a wait in the queue's global control state.
        const signal = options.signal;
        await waitUntilWorldTimeDeadline({
            deadlineTimeMs,
            pollIntervalMs,
            onTick,
            shouldStopWaiting: () => {
                signal.throwIfAborted();
                return false;
            },
            waitForMilliseconds: async (waitDurationMs) => {
                await waitForTimeout(waitDurationMs, undefined, { signal });
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
