import moment from 'moment';

/**
 * Calendar formats used when displaying the estimated completion time.
 */
export const ESTIMATED_DONE_CALENDAR_FORMATS = {
    sameDay: '[Today] h:mm',
    nextDay: '[Tomorrow] h:mm',
    nextWeek: 'dddd h:mm',
    lastDay: '[Yesterday] h:mm',
    lastWeek: 'dddd h:mm',
    sameElse: 'MMM D h:mm',
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
