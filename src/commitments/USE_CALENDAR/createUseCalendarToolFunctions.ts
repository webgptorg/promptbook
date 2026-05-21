import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../types/string_person_fullname';
import { callGoogleCalendarApi } from './callGoogleCalendarApi';
import type { UseCalendarToolArgsBase, UseCalendarToolRuntimeResolution } from './resolveUseCalendarToolRuntimeOrWalletCredentialResult';
import { resolveUseCalendarToolRuntimeOrWalletCredentialResult } from './resolveUseCalendarToolRuntimeOrWalletCredentialResult';
import { UseCalendarToolNames } from './UseCalendarToolNames';

/**
 * Minimal Google Calendar event payload shape used by USE CALENDAR tools.
 *
 * @private type of UseCalendarCommitmentDefinition
 */
type GoogleCalendarEvent = {
    id?: string;
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
    organizer?: {
        email?: string;
        displayName?: string;
    };
};

/**
 * Minimal Google Calendar events list response shape.
 *
 * @private type of UseCalendarCommitmentDefinition
 */
type GoogleCalendarEventListResponse = {
    items?: GoogleCalendarEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
};

/**
 * Arguments accepted by `calendar_list_events`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarListEventsToolArgs = UseCalendarToolArgsBase & {
    timeMin?: string;
    timeMax?: string;
    query?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    timeZone?: string;
};

/**
 * Arguments accepted by `calendar_get_event`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarGetEventToolArgs = UseCalendarToolArgsBase & {
    eventId: string;
};

/**
 * Arguments accepted by `calendar_create_event`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarCreateEventToolArgs = UseCalendarToolArgsBase & {
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    timeZone?: string;
    attendees?: string[];
    reminderMinutes?: number[];
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Arguments accepted by `calendar_update_event`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarUpdateEventToolArgs = UseCalendarToolArgsBase & {
    eventId: string;
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
 * Arguments accepted by `calendar_delete_event`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarDeleteEventToolArgs = UseCalendarToolArgsBase & {
    eventId: string;
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Arguments accepted by `calendar_invite_guests`.
 *
 * @private type of createUseCalendarToolFunctions
 */
type CalendarInviteGuestsToolArgs = UseCalendarToolArgsBase & {
    eventId: string;
    guests: string[];
    sendUpdates?: 'all' | 'externalOnly' | 'none';
};

/**
 * Gets Google Calendar tool function implementations.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
export function createUseCalendarToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [UseCalendarToolNames.listEvents](args: CalendarListEventsToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const query: Record<string, string> = {};
                if (normalizeOptionalText(args.timeMin)) {
                    query.timeMin = args.timeMin!.trim();
                }
                if (normalizeOptionalText(args.timeMax)) {
                    query.timeMax = args.timeMax!.trim();
                }
                if (normalizeOptionalText(args.query)) {
                    query.q = args.query!.trim();
                }
                if (typeof args.maxResults === 'number' && Number.isFinite(args.maxResults) && args.maxResults > 0) {
                    query.maxResults = String(Math.floor(args.maxResults));
                }
                if (args.singleEvents !== undefined) {
                    query.singleEvents = args.singleEvents ? 'true' : 'false';
                }
                if (args.orderBy === 'startTime' || args.orderBy === 'updated') {
                    query.orderBy = args.orderBy;
                }
                if (normalizeOptionalText(args.timeZone)) {
                    query.timeZone = args.timeZone!.trim();
                }

                const payload = await callGoogleCalendarApi<GoogleCalendarEventListResponse>(accessToken, {
                    method: 'GET',
                    path: `/calendars/${encodeGoogleCalendarId(calendarReference.calendarId)}/events`,
                    query,
                });

                const events = (payload?.items || []).map((event) => mapGoogleCalendarEvent(event));
                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    events,
                    nextPageToken: payload?.nextPageToken || null,
                    nextSyncToken: payload?.nextSyncToken || null,
                });
            });
        },

        async [UseCalendarToolNames.getEvent](args: CalendarGetEventToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const eventId = normalizeRequiredText(args.eventId, 'eventId');
                const payload = await callGoogleCalendarApi<GoogleCalendarEvent>(accessToken, {
                    method: 'GET',
                    path: `/calendars/${encodeGoogleCalendarId(
                        calendarReference.calendarId,
                    )}/events/${encodeURIComponent(eventId)}`,
                });

                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    event: mapGoogleCalendarEvent(payload || {}),
                });
            });
        },

        async [UseCalendarToolNames.createEvent](args: CalendarCreateEventToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const requestBody = createGoogleCalendarEventPayload({
                    summary: normalizeRequiredText(args.summary, 'summary'),
                    description: normalizeOptionalText(args.description),
                    location: normalizeOptionalText(args.location),
                    start: normalizeRequiredText(args.start, 'start'),
                    end: normalizeRequiredText(args.end, 'end'),
                    timeZone: normalizeOptionalText(args.timeZone),
                    attendees: normalizeAttendees(args.attendees),
                    reminderMinutes: normalizeReminderMinutes(args.reminderMinutes),
                });

                const payload = await callGoogleCalendarApi<GoogleCalendarEvent>(accessToken, {
                    method: 'POST',
                    path: `/calendars/${encodeGoogleCalendarId(calendarReference.calendarId)}/events`,
                    query: createSendUpdatesQuery(args.sendUpdates),
                    body: requestBody,
                });

                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    event: mapGoogleCalendarEvent(payload || {}),
                });
            });
        },

        async [UseCalendarToolNames.updateEvent](args: CalendarUpdateEventToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const eventId = normalizeRequiredText(args.eventId, 'eventId');
                const requestBody = createGoogleCalendarEventPayload({
                    summary: normalizeOptionalText(args.summary),
                    description: normalizeOptionalText(args.description),
                    location: normalizeOptionalText(args.location),
                    start: normalizeOptionalText(args.start),
                    end: normalizeOptionalText(args.end),
                    timeZone: normalizeOptionalText(args.timeZone),
                    attendees: normalizeAttendees(args.attendees),
                    reminderMinutes: normalizeReminderMinutes(args.reminderMinutes),
                });

                const payload = await callGoogleCalendarApi<GoogleCalendarEvent>(accessToken, {
                    method: 'PATCH',
                    path: `/calendars/${encodeGoogleCalendarId(
                        calendarReference.calendarId,
                    )}/events/${encodeURIComponent(eventId)}`,
                    query: createSendUpdatesQuery(args.sendUpdates),
                    body: requestBody,
                });

                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    event: mapGoogleCalendarEvent(payload || {}),
                });
            });
        },

        async [UseCalendarToolNames.deleteEvent](args: CalendarDeleteEventToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const eventId = normalizeRequiredText(args.eventId, 'eventId');
                await callGoogleCalendarApi(accessToken, {
                    method: 'DELETE',
                    path: `/calendars/${encodeGoogleCalendarId(
                        calendarReference.calendarId,
                    )}/events/${encodeURIComponent(eventId)}`,
                    query: createSendUpdatesQuery(args.sendUpdates),
                });

                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    eventId,
                    status: 'deleted',
                });
            });
        },

        async [UseCalendarToolNames.inviteGuests](args: CalendarInviteGuestsToolArgs): Promise<string> {
            return withUseCalendarRuntime(args, async ({ calendarReference, accessToken }) => {
                const eventId = normalizeRequiredText(args.eventId, 'eventId');
                const guests = normalizeAttendees(args.guests);
                if (guests.length === 0) {
                    throw new Error('Tool "calendar_invite_guests" requires non-empty "guests".');
                }

                const existingEvent = await callGoogleCalendarApi<GoogleCalendarEvent>(accessToken, {
                    method: 'GET',
                    path: `/calendars/${encodeGoogleCalendarId(
                        calendarReference.calendarId,
                    )}/events/${encodeURIComponent(eventId)}`,
                });
                const existingAttendees = (existingEvent?.attendees || [])
                    .map((attendee) => normalizeOptionalText(attendee.email))
                    .filter((email): email is string => Boolean(email));
                const mergedAttendees = [...new Set([...existingAttendees, ...guests])];

                const payload = await callGoogleCalendarApi<GoogleCalendarEvent>(accessToken, {
                    method: 'PATCH',
                    path: `/calendars/${encodeGoogleCalendarId(
                        calendarReference.calendarId,
                    )}/events/${encodeURIComponent(eventId)}`,
                    query: createSendUpdatesQuery(args.sendUpdates),
                    body: {
                        attendees: mergedAttendees.map((email) => ({ email })),
                    },
                });

                return JSON.stringify({
                    provider: calendarReference.provider,
                    calendarUrl: calendarReference.url,
                    calendarId: calendarReference.calendarId,
                    event: mapGoogleCalendarEvent(payload || {}),
                    invitedGuests: guests,
                });
            });
        },
    };
}

/**
 * Executes one tool operation with resolved USE CALENDAR runtime.
 *
 * @private function of createUseCalendarToolFunctions
 */
async function withUseCalendarRuntime(
    args: UseCalendarToolArgsBase,
    operation: (runtime: Exclude<UseCalendarToolRuntimeResolution, { walletResult: string }>) => Promise<string>,
): Promise<string> {
    const runtime = resolveUseCalendarToolRuntimeOrWalletCredentialResult(args);
    if ('walletResult' in runtime) {
        return runtime.walletResult;
    }

    return operation(runtime);
}

/**
 * Encodes one Google calendar id for URL path usage.
 *
 * @private function of createUseCalendarToolFunctions
 */
function encodeGoogleCalendarId(calendarId: string): string {
    return encodeURIComponent(calendarId);
}

/**
 * Normalizes one required textual input.
 *
 * @private function of createUseCalendarToolFunctions
 */
function normalizeRequiredText(value: unknown, fieldName: string): string {
    const normalizedValue = normalizeOptionalText(value);
    if (!normalizedValue) {
        throw new Error(`Tool "${fieldName}" requires non-empty value.`);
    }

    return normalizedValue;
}

/**
 * Normalizes unknown text input to trimmed non-empty string.
 *
 * @private function of createUseCalendarToolFunctions
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

/**
 * Normalizes optional attendee list from tool input.
 *
 * @private function of createUseCalendarToolFunctions
 */
function normalizeAttendees(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedAttendees = value
        .filter((attendee): attendee is string => typeof attendee === 'string')
        .map((attendee) => attendee.trim())
        .filter(Boolean);

    return [...new Set(normalizedAttendees)];
}

/**
 * Normalizes optional reminder-minute offsets from tool input.
 *
 * @private function of createUseCalendarToolFunctions
 */
function normalizeReminderMinutes(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const reminderMinutes = value
        .filter((minute): minute is number => typeof minute === 'number' && Number.isFinite(minute))
        .map((minute) => Math.max(0, Math.floor(minute)));

    return [...new Set(reminderMinutes)];
}

/**
 * Builds optional `sendUpdates` query for mutating Google Calendar requests.
 *
 * @private function of createUseCalendarToolFunctions
 */
function createSendUpdatesQuery(sendUpdates: unknown): Record<string, string> {
    if (sendUpdates === 'all' || sendUpdates === 'externalOnly' || sendUpdates === 'none') {
        return { sendUpdates };
    }

    return {};
}

/**
 * Creates one Google Calendar event payload from normalized tool arguments.
 *
 * @private function of createUseCalendarToolFunctions
 */
function createGoogleCalendarEventPayload(options: {
    summary?: string;
    description?: string;
    location?: string;
    start?: string;
    end?: string;
    timeZone?: string;
    attendees?: string[];
    reminderMinutes?: number[];
}): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (options.summary) {
        payload.summary = options.summary;
    }
    if (options.description) {
        payload.description = options.description;
    }
    if (options.location) {
        payload.location = options.location;
    }
    if (options.start) {
        payload.start = createGoogleCalendarDateValue(options.start, options.timeZone);
    }
    if (options.end) {
        payload.end = createGoogleCalendarDateValue(options.end, options.timeZone);
    }
    if (options.attendees && options.attendees.length > 0) {
        payload.attendees = options.attendees.map((email) => ({ email }));
    }
    if (options.reminderMinutes && options.reminderMinutes.length > 0) {
        payload.reminders = {
            useDefault: false,
            overrides: options.reminderMinutes.map((minutes) => ({
                method: 'popup',
                minutes,
            })),
        };
    }

    return payload;
}

/**
 * Converts date/dateTime input into a Google Calendar-compatible date object.
 *
 * @private function of createUseCalendarToolFunctions
 */
function createGoogleCalendarDateValue(value: string, timeZone?: string): Record<string, string> {
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
 * Maps raw Google Calendar event payload to a compact tool result object.
 *
 * @private function of createUseCalendarToolFunctions
 */
function mapGoogleCalendarEvent(event: GoogleCalendarEvent): Record<string, unknown> {
    return {
        id: event.id || null,
        summary: event.summary || null,
        description: event.description || null,
        location: event.location || null,
        status: event.status || null,
        htmlLink: event.htmlLink || null,
        start: event.start || null,
        end: event.end || null,
        organizer: event.organizer || null,
        attendees: (event.attendees || []).map((attendee) => ({
            email: attendee.email || null,
            responseStatus: attendee.responseStatus || null,
        })),
    };
}
