import moment from 'moment';

/**
 * Calendar formats used when displaying the estimated completion time.
 *
 * Uses 24-hour format (`HH:mm`) so estimates are unambiguous (for example `17:30` instead of `5:30`).
 */
export const ESTIMATED_DONE_CALENDAR_FORMATS = {
    sameDay: '[Today] HH:mm',
    nextDay: '[Tomorrow] HH:mm',
    nextWeek: 'dddd HH:mm',
    lastDay: '[Yesterday] HH:mm',
    lastWeek: 'dddd HH:mm',
    sameElse: 'MMM D HH:mm',
} satisfies moment.CalendarSpec;

/**
 * Formats a duration into a compact string such as "3h 12m" or "45s".
 */
export function formatDurationBrief(duration: moment.Duration): string {
    const totalSeconds = Math.max(0, Math.round(duration.asSeconds()));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (!parts.length && seconds > 0) {
        parts.push(`${seconds}s`);
    }
    if (!parts.length) {
        parts.push('0s');
    }

    return parts.join(' ');
}
