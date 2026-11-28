/**
 * Normalizes unknown nullable text field.
 *
 * @private function of calendarConnections
 */
export function normalizeCalendarNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}
