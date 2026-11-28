/**
 * Milliseconds in one second.
 */
const SECOND_IN_MILLISECONDS = 1_000;

/**
 * Milliseconds in one minute.
 */
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;

/**
 * Milliseconds in one hour.
 */
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;

/**
 * Milliseconds in one day.
 */
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

/**
 * Threshold below which countdown labels start showing seconds.
 */
const SECONDS_VISIBILITY_THRESHOLD_MS = 3 * MINUTE_IN_MILLISECONDS;

/**
 * Formats one timeout countdown label using compact chat-friendly rules.
 */
export function formatChatTimeoutRemainingTime(dueAt: string, currentTimestamp: number): string {
    const dueTimestamp = new Date(dueAt).getTime();

    if (!Number.isFinite(dueTimestamp)) {
        return 'Timer';
    }

    const remainingMilliseconds = dueTimestamp - currentTimestamp;
    if (remainingMilliseconds <= 0) {
        return 'Due now';
    }

    if (remainingMilliseconds < MINUTE_IN_MILLISECONDS) {
        return `${Math.floor(remainingMilliseconds / SECOND_IN_MILLISECONDS)}s`;
    }

    if (remainingMilliseconds < SECONDS_VISIBILITY_THRESHOLD_MS) {
        const totalSeconds = Math.floor(remainingMilliseconds / SECOND_IN_MILLISECONDS);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}m ${seconds}s`;
    }

    if (remainingMilliseconds < HOUR_IN_MILLISECONDS) {
        return `${Math.floor(remainingMilliseconds / MINUTE_IN_MILLISECONDS)}m`;
    }

    if (remainingMilliseconds < DAY_IN_MILLISECONDS) {
        return formatChatTimeoutWithHoursAndMinutes(remainingMilliseconds);
    }

    return formatChatTimeoutWithDaysAndHours(remainingMilliseconds);
}

/**
 * Formats one timeout label when at least one hour remains.
 */
function formatChatTimeoutWithHoursAndMinutes(remainingMilliseconds: number): string {
    const totalMinutes = Math.floor(remainingMilliseconds / MINUTE_IN_MILLISECONDS);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Formats one timeout label when at least one full day remains.
 */
function formatChatTimeoutWithDaysAndHours(remainingMilliseconds: number): string {
    const totalHours = Math.floor(remainingMilliseconds / HOUR_IN_MILLISECONDS);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}
