import { formatToolCallDateTime } from './formatToolCallDateTime';

/**
 * Formats a Date as a locale-aware short time string (e.g. "5:30 PM" or "17:30").
 *
 * When omitted the browser/OS default locale is used.
 *
 * @param date - Date to format.
 * @param locale - Optional BCP-47 locale string (e.g. `"en"`, `"cs"`).
 * @returns Formatted time string such as `"5:30 PM"` or `"17:30"`.
 *
 * @private utility of `<Chat/>`
 */
export function formatToolCallLocalTime(date: Date, locale?: string): string {
    return formatToolCallDateTime(date, { locale }).localTimeLabel;
}
