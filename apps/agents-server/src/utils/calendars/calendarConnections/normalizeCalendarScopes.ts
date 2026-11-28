/**
 * Normalizes unknown scopes payload into unique trimmed string list.
 *
 * @private function of calendarConnections
 */
export function normalizeCalendarScopes(rawScopes: unknown): string[] {
    if (!Array.isArray(rawScopes)) {
        return [];
    }

    return [
        ...new Set(
            rawScopes
                .filter((scope): scope is string => typeof scope === 'string')
                .map((scope) => scope.trim())
                .filter(Boolean),
        ),
    ];
}
