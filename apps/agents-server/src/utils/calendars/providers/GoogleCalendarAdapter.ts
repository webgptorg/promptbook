import { spaceTrim } from 'spacetrim';
import type {
    CalendarProvider,
    CalendarProviderCalendar,
    CalendarProviderDeleteEventInput,
    CalendarProviderEvent,
    CalendarProviderInviteGuestsInput,
    CalendarProviderListEventsInput,
    CalendarProviderUpsertEventInput,
} from './CalendarProvider';

/**
 * Google Calendar API base URL.
 */
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Provider adapter for Google Calendar.
 */
export class GoogleCalendarAdapter implements CalendarProvider {
    public async listCalendars(accessToken: string): Promise<CalendarProviderCalendar[]> {
        const payload = await this.callGoogleCalendarApi<{
            items?: Array<{
                id?: string;
                summary?: string;
                description?: string;
                timeZone?: string;
                accessRole?: string;
                primary?: boolean;
            }>;
        }>(accessToken, {
            method: 'GET',
            path: '/users/me/calendarList',
        });

        return (payload.items || [])
            .map((calendar) => ({
                id: calendar.id || '',
                summary: calendar.summary || calendar.id || 'Calendar',
                description: calendar.description,
                timeZone: calendar.timeZone,
                accessRole: calendar.accessRole,
                primary: calendar.primary,
            }))
            .filter((calendar) => calendar.id);
    }

    public async listEvents(
        accessToken: string,
        input: CalendarProviderListEventsInput,
    ): Promise<CalendarProviderEvent[]> {
        const payload = await this.callGoogleCalendarApi<{
            items?: Array<Record<string, unknown>>;
        }>(accessToken, {
            method: 'GET',
            path: `/calendars/${encodeURIComponent(input.calendarId)}/events`,
            query: {
                ...(input.timeMin ? { timeMin: input.timeMin } : {}),
                ...(input.timeMax ? { timeMax: input.timeMax } : {}),
                ...(input.query ? { q: input.query } : {}),
                ...(input.maxResults ? { maxResults: String(Math.max(1, Math.floor(input.maxResults))) } : {}),
                ...(input.singleEvents !== undefined ? { singleEvents: input.singleEvents ? 'true' : 'false' } : {}),
                ...(input.orderBy ? { orderBy: input.orderBy } : {}),
                ...(input.timeZone ? { timeZone: input.timeZone } : {}),
            },
        });

        return (payload.items || []).map((event) => this.mapGoogleEvent(event));
    }

    public async getEvent(
        accessToken: string,
        calendarId: string,
        eventId: string,
    ): Promise<CalendarProviderEvent> {
        const payload = await this.callGoogleCalendarApi<Record<string, unknown>>(accessToken, {
            method: 'GET',
            path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        });

        return this.mapGoogleEvent(payload);
    }

    public async createEvent(
        accessToken: string,
        input: CalendarProviderUpsertEventInput,
    ): Promise<CalendarProviderEvent> {
        const payload = await this.callGoogleCalendarApi<Record<string, unknown>>(accessToken, {
            method: 'POST',
            path: `/calendars/${encodeURIComponent(input.calendarId)}/events`,
            query: createSendUpdatesQuery(input.sendUpdates),
            body: createEventPayload(input),
        });

        return this.mapGoogleEvent(payload);
    }

    public async updateEvent(
        accessToken: string,
        input: CalendarProviderUpsertEventInput,
    ): Promise<CalendarProviderEvent> {
        if (!input.eventId) {
            throw new Error('`eventId` is required for calendar event update.');
        }

        const payload = await this.callGoogleCalendarApi<Record<string, unknown>>(accessToken, {
            method: 'PATCH',
            path: `/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            query: createSendUpdatesQuery(input.sendUpdates),
            body: createEventPayload(input),
        });

        return this.mapGoogleEvent(payload);
    }

    public async deleteEvent(accessToken: string, input: CalendarProviderDeleteEventInput): Promise<void> {
        await this.callGoogleCalendarApi(accessToken, {
            method: 'DELETE',
            path: `/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            query: createSendUpdatesQuery(input.sendUpdates),
        });
    }

    public async inviteGuests(
        accessToken: string,
        input: CalendarProviderInviteGuestsInput,
    ): Promise<CalendarProviderEvent> {
        const existingEvent = await this.getEvent(accessToken, input.calendarId, input.eventId);
        const existingGuests = (existingEvent.attendees || [])
            .map((attendee) => normalizeOptionalText(attendee.email))
            .filter((email): email is string => Boolean(email));
        const newGuests = normalizeAttendees(input.guests);
        const mergedGuests = [...new Set([...existingGuests, ...newGuests])];

        const payload = await this.callGoogleCalendarApi<Record<string, unknown>>(accessToken, {
            method: 'PATCH',
            path: `/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            query: createSendUpdatesQuery(input.sendUpdates),
            body: {
                attendees: mergedGuests.map((email) => ({ email })),
            },
        });

        return this.mapGoogleEvent(payload);
    }

    /**
     * Executes one Google Calendar API request.
     *
     * @private function of GoogleCalendarAdapter
     */
    private async callGoogleCalendarApi<TResponse = unknown>(
        accessToken: string,
        options: {
            method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
            path: string;
            query?: Record<string, string>;
            body?: Record<string, unknown>;
        },
    ): Promise<TResponse> {
        const url = new URL(options.path, GOOGLE_CALENDAR_API_BASE_URL);
        if (options.query) {
            for (const [key, value] of Object.entries(options.query)) {
                if (value && value.trim()) {
                    url.searchParams.set(key, value);
                }
            }
        }

        const response = await fetch(url.toString(), {
            method: options.method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const textPayload = await response.text();
        const parsedPayload = tryParseJson(textPayload);

        if (!response.ok) {
            throw new Error(
                spaceTrim(`
                    Google Calendar API request failed (${response.status} ${response.statusText}):
                    ${extractGoogleCalendarApiErrorMessage(parsedPayload, textPayload)}
                `),
            );
        }

        return parsedPayload as TResponse;
    }

    /**
     * Maps raw Google event payload to normalized provider event.
     *
     * @private function of GoogleCalendarAdapter
     */
    private mapGoogleEvent(rawEvent: Record<string, unknown>): CalendarProviderEvent {
        return {
            id: normalizeOptionalText(rawEvent.id) || '',
            summary: normalizeOptionalText(rawEvent.summary),
            description: normalizeOptionalText(rawEvent.description),
            location: normalizeOptionalText(rawEvent.location),
            status: normalizeOptionalText(rawEvent.status),
            htmlLink: normalizeOptionalText(rawEvent.htmlLink),
            start: normalizeEventDateValue(rawEvent.start),
            end: normalizeEventDateValue(rawEvent.end),
            attendees: normalizeAttendeeList(rawEvent.attendees),
        };
    }
}

/**
 * Creates one Google Calendar event payload from normalized API input.
 *
 * @private function of GoogleCalendarAdapter
 */
function createEventPayload(input: CalendarProviderUpsertEventInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.summary) {
        payload.summary = input.summary;
    }
    if (input.description) {
        payload.description = input.description;
    }
    if (input.location) {
        payload.location = input.location;
    }
    if (input.start) {
        payload.start = createDateValue(input.start, input.timeZone);
    }
    if (input.end) {
        payload.end = createDateValue(input.end, input.timeZone);
    }

    const attendees = normalizeAttendees(input.attendees);
    if (attendees.length > 0) {
        payload.attendees = attendees.map((email) => ({ email }));
    }

    const reminderMinutes = normalizeReminderMinutes(input.reminderMinutes);
    if (reminderMinutes.length > 0) {
        payload.reminders = {
            useDefault: false,
            overrides: reminderMinutes.map((minutes) => ({
                method: 'popup',
                minutes,
            })),
        };
    }

    return payload;
}

/**
 * Converts one datetime/date input into Google Calendar date object.
 *
 * @private function of GoogleCalendarAdapter
 */
function createDateValue(value: string, timeZone?: string): Record<string, string> {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (isDateOnly) {
        return {
            date: value,
        };
    }

    return {
        dateTime: value,
        ...(timeZone ? { timeZone } : {}),
    };
}

/**
 * Builds optional `sendUpdates` query for mutating Google Calendar requests.
 *
 * @private function of GoogleCalendarAdapter
 */
function createSendUpdatesQuery(sendUpdates: unknown): Record<string, string> {
    if (sendUpdates === 'all' || sendUpdates === 'externalOnly' || sendUpdates === 'none') {
        return { sendUpdates };
    }

    return {};
}

/**
 * Parses raw JSON text when possible.
 *
 * @private function of GoogleCalendarAdapter
 */
function tryParseJson(rawText: string): unknown {
    if (!rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

/**
 * Extracts user-friendly message from Google Calendar API error payload.
 *
 * @private function of GoogleCalendarAdapter
 */
function extractGoogleCalendarApiErrorMessage(parsedPayload: unknown, fallbackText: string): string {
    if (parsedPayload && typeof parsedPayload === 'object') {
        const payload = parsedPayload as { error?: unknown };
        if (payload.error && typeof payload.error === 'object') {
            const errorPayload = payload.error as { message?: unknown };
            const message = normalizeOptionalText(errorPayload.message);
            if (message) {
                return message;
            }
        }
    }

    return fallbackText || 'Unknown Google Calendar API error';
}

/**
 * Normalizes unknown optional string field.
 *
 * @private function of GoogleCalendarAdapter
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

/**
 * Normalizes unknown attendees input into unique email list.
 *
 * @private function of GoogleCalendarAdapter
 */
function normalizeAttendees(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return [...new Set(value.filter((email): email is string => typeof email === 'string').map((email) => email.trim()).filter(Boolean))];
}

/**
 * Normalizes unknown reminder offsets into unique integers.
 *
 * @private function of GoogleCalendarAdapter
 */
function normalizeReminderMinutes(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return [...new Set(value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item)).map((item) => Math.max(0, Math.floor(item))))];
}

/**
 * Normalizes optional event date object.
 *
 * @private function of GoogleCalendarAdapter
 */
function normalizeEventDateValue(value: unknown): CalendarProviderEvent['start'] | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const dateValue = value as Record<string, unknown>;
    const date = normalizeOptionalText(dateValue.date);
    const dateTime = normalizeOptionalText(dateValue.dateTime);
    const timeZone = normalizeOptionalText(dateValue.timeZone);

    if (!date && !dateTime) {
        return undefined;
    }

    return {
        ...(date ? { date } : {}),
        ...(dateTime ? { dateTime } : {}),
        ...(timeZone ? { timeZone } : {}),
    };
}

/**
 * Normalizes optional attendees payload.
 *
 * @private function of GoogleCalendarAdapter
 */
function normalizeAttendeeList(value: unknown): CalendarProviderEvent['attendees'] {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value
        .filter((attendee): attendee is Record<string, unknown> => Boolean(attendee) && typeof attendee === 'object')
        .map((attendee) => ({
            ...(normalizeOptionalText(attendee.email) ? { email: normalizeOptionalText(attendee.email) } : {}),
            ...(normalizeOptionalText(attendee.responseStatus)
                ? { responseStatus: normalizeOptionalText(attendee.responseStatus) }
                : {}),
        }));
}
