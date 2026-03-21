import type { CalendarProvider } from './CalendarProvider';
import { GoogleCalendarAdapter } from './GoogleCalendarAdapter';

/**
 * Shared Google Calendar adapter singleton.
 */
const googleCalendarAdapter = new GoogleCalendarAdapter();

/**
 * Resolves one calendar provider adapter by provider id.
 */
export function getCalendarProviderAdapter(provider: string): CalendarProvider {
    if (provider.trim().toLowerCase() === 'google') {
        return googleCalendarAdapter;
    }

    throw new Error(`Unsupported calendar provider "${provider}".`);
}
