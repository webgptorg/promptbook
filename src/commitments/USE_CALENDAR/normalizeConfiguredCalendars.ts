import type { CalendarProviderType } from './calendarReference';

/**
 * Normalized calendar definition persisted in USE CALENDAR metadata.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export type ConfiguredCalendar = {
    provider: CalendarProviderType;
    url: string;
    calendarId: string;
    scopes: string[];
    tokenRef?: string;
};

/**
 * Normalizes unknown metadata payload into a typed list of configured calendars.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export function normalizeConfiguredCalendars(rawCalendars: unknown): ConfiguredCalendar[] {
    if (!Array.isArray(rawCalendars)) {
        return [];
    }

    const uniqueCalendars = new Set<string>();
    const calendars: ConfiguredCalendar[] = [];

    for (const rawCalendar of rawCalendars) {
        if (!rawCalendar || typeof rawCalendar !== 'object') {
            continue;
        }

        const calendar = rawCalendar as Record<string, unknown>;
        const provider = normalizeProvider(calendar.provider);
        const url = normalizeText(calendar.url);
        const calendarId = normalizeText(calendar.calendarId);

        if (!provider || !url || !calendarId) {
            continue;
        }

        const uniqueKey = `${provider}|${url}`;
        if (uniqueCalendars.has(uniqueKey)) {
            continue;
        }

        uniqueCalendars.add(uniqueKey);

        const scopes = Array.isArray(calendar.scopes)
            ? calendar.scopes
                  .filter((scope): scope is string => typeof scope === 'string')
                  .map((scope) => scope.trim())
                  .filter(Boolean)
            : [];

        calendars.push({
            provider,
            url,
            calendarId,
            scopes,
            ...(normalizeText(calendar.tokenRef) ? { tokenRef: normalizeText(calendar.tokenRef) } : {}),
        });
    }

    return calendars;
}

/**
 * Normalizes optional provider text to one supported value.
 *
 * @private function of normalizeConfiguredCalendars
 */
function normalizeProvider(value: unknown): CalendarProviderType | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedProvider = value.trim().toLowerCase();
    if (normalizedProvider === 'google') {
        return 'google';
    }

    return null;
}

/**
 * Normalizes unknown text input to trimmed non-empty string.
 *
 * @private function of normalizeConfiguredCalendars
 */
function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}
