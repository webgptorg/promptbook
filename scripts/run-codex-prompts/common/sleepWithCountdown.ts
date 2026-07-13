import colors from 'colors';
import { formatDurationMs } from './parseDuration';
import type { CoderRunUiHandle } from '../ui/renderCoderRunUi';
import { waitUntilWorldTimeDeadline } from './waitUntilWorldTimeDeadline';

/**
 * Refresh interval used by the countdown display while waiting.
 *
 * @private internal constant of `sleepWithCountdown`
 */
const WAIT_COUNTDOWN_UPDATE_INTERVAL_MS = 30_000;

/**
 * Distinct kinds of wait shown by the run loop so the UI can label them clearly.
 *
 * @public exported from `@promptbook/cli`
 */
export type CoderRunWaitKind = 'after-prompt' | 'between-prompts' | 'after-error';

/**
 * Returns the human-readable status message used for one wait kind.
 *
 * @private internal utility of `sleepWithCountdown`
 */
export function describeCoderRunWait(waitKind: CoderRunWaitKind, remainingMs: number, totalMs?: number): string {
    const formattedRemaining = formatDurationMs(remainingMs);
    const formattedTotal = totalMs !== undefined ? formatDurationMs(totalMs) : undefined;
    const totalSuffix = formattedTotal !== undefined ? ` of ${formattedTotal}` : '';

    switch (waitKind) {
        case 'between-prompts':
            return `Waiting ${formattedRemaining}${totalSuffix} between prompts (paced from previous start)`;
        case 'after-prompt':
            return `Waiting ${formattedRemaining}${totalSuffix} after previous prompt`;
        case 'after-error':
            return `Waiting ${formattedRemaining}${totalSuffix} before retrying after error`;
    }
}

/**
 * Sleeps the requested duration while refreshing the status message on a UI handle and the plain console.
 *
 * The wait kind is shown in the UI status so the user can distinguish `--wait-after-prompt`,
 * `--wait-between-prompts`, and `--wait-after-error` waits at a glance.
 *
 * @public exported from `@promptbook/cli`
 */
export async function sleepWithCountdown(options: {
    durationMs: number;
    deadlineTimeMs?: number;
    waitKind: CoderRunWaitKind;
    isRichUiEnabled: boolean;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const { durationMs, waitKind, isRichUiEnabled, uiHandle } = options;

    if (durationMs <= 0) {
        return;
    }

    const deadlineTimeMs = options.deadlineTimeMs ?? Date.now() + durationMs;

    await waitUntilWorldTimeDeadline({
        deadlineTimeMs,
        pollIntervalMs: WAIT_COUNTDOWN_UPDATE_INTERVAL_MS,
        onTick: (remainingDurationMs) => {
            const visibleRemainingDurationMs = Math.min(remainingDurationMs, durationMs);
            const statusMessage = describeCoderRunWait(waitKind, visibleRemainingDurationMs, durationMs);

            if (!isRichUiEnabled) {
                console.info(colors.gray(`${statusMessage}...`));
                return;
            }

            uiHandle?.state.setStatusMessage(`${statusMessage}...`);
        },
    });
}
