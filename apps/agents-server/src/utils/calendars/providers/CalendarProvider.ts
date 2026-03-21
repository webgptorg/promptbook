/**
 * Normalized calendar descriptor returned by provider adapters.
 */
export type CalendarProviderCalendar = {
    id: string;
    summary: string;
    description?: string;
    timeZone?: string;
    accessRole?: string;
    primary?: boolean;
};

/**
 * Normalized event shape returned by provider adapters.
 */
export type CalendarProviderEvent = {
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    status?: string;
    htmlLink?: string;
    start?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    end?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email?: string;
        responseStatus?: string;
    }>;
};

/**
 * Input for listing events through one provider adapter.
 */
export type CalendarProviderListEventsInput = {
    calendarId: string;
    timeMin?: string;
    timeMax?: string;
    query?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    timeZone?: string;
};

/**
 * Input for creating or updating one event through one provider adapter.
 */
export type CalendarProviderUpsertEventInput = {
    calendarId: string;
    eventId?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: string;
    end?: string;
    timeZone?: string;
    attendees?: string[];
    reminderMinutes?: number[];
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Input for deleting one event through one provider adapter.
 */
export type CalendarProviderDeleteEventInput = {
    calendarId: string;
    eventId: string;
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Input for inviting guests through one provider adapter.
 */
export type CalendarProviderInviteGuestsInput = {
    calendarId: string;
    eventId: string;
    guests: string[];
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Provider adapter interface used by Agents Server calendar APIs.
 */
export type CalendarProvider = {
    listCalendars(accessToken: string): Promise<CalendarProviderCalendar[]>;
    listEvents(accessToken: string, input: CalendarProviderListEventsInput): Promise<CalendarProviderEvent[]>;
    getEvent(accessToken: string, calendarId: string, eventId: string): Promise<CalendarProviderEvent>;
    createEvent(accessToken: string, input: CalendarProviderUpsertEventInput): Promise<CalendarProviderEvent>;
    updateEvent(accessToken: string, input: CalendarProviderUpsertEventInput): Promise<CalendarProviderEvent>;
    deleteEvent(accessToken: string, input: CalendarProviderDeleteEventInput): Promise<void>;
    inviteGuests(accessToken: string, input: CalendarProviderInviteGuestsInput): Promise<CalendarProviderEvent>;
};
