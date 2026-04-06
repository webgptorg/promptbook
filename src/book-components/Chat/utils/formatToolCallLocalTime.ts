/**
 * Formats a Date as a locale-aware short time string (e.g. "5:30 PM" or "17:30").
 *
 * Passing `undefined` as locale delegates to the runtime's default locale which
 * always produces a complete, well-formed result.  Passing `[]` (empty array) can
 * cause browsers to omit the hour component and render broken output like " : PM".
 *
 * @param date - Date to format.
 * @param locale - Optional BCP-47 locale string (e.g. `"en"`, `"cs"`).
 *                 When omitted the browser/OS default locale is used.
 * @returns Formatted time string such as `"5:30 PM"` or `"17:30"`.
 *
 * @private utility of `<Chat/>`
 */
export function formatToolCallLocalTime(date: Date, locale?: string): string {
    return date.toLocaleTimeString(locale || undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
}
