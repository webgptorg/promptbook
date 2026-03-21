import { createCalendarActivity, getCalendarProviderAdapter, listCalendarConnections } from '@/src/utils/calendars';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import type { CalendarConnectionRecord } from '@/src/utils/calendars';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../user-chats/resolveUserChatScope';

/**
 * Supported calendar-event API operations.
 */
type CalendarEventsOperation =
    | 'list_events'
    | 'get_event'
    | 'create_event'
    | 'update_event'
    | 'delete_event'
    | 'invite_guests';

/**
 * Sanitized subset of calendar operation input persisted in activity logs.
 */
type SanitizedCalendarOperationRequest = {
    operation: CalendarEventsOperation | null;
    connectionId: number | null;
    calendarUrl: string | null;
    calendarId: string | null;
    eventId: string | null;
    timeMin: string | null;
    timeMax: string | null;
};

/**
 * Lists available calendars for one resolved calendar connection.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const requestUrl = new URL(request.url);
        const connectionId = parsePositiveInteger(requestUrl.searchParams.get('connectionId'));
        const calendarUrl = normalizeOptionalText(requestUrl.searchParams.get('calendarUrl'));
        const connection = await resolveCalendarConnection({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId,
            calendarUrl,
        });
        const accessToken = await resolveUseCalendarGoogleToken({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
        });
        if (!accessToken) {
            return NextResponse.json(
                { error: 'No usable Google Calendar token found. Re-authenticate calendar access first.' },
                { status: 403 },
            );
        }

        const providerAdapter = getCalendarProviderAdapter(connection.provider);
        const calendars = await providerAdapter.listCalendars(accessToken);

        await createCalendarActivity({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId: connection.id,
            provider: connection.provider,
            operation: 'list_calendars',
            calendarUrl: connection.calendarUrl,
            status: 'success',
            details: {
                calendarsCount: calendars.length,
            },
        });

        return NextResponse.json({
            connection,
            calendars,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list calendars.' },
            { status: 500 },
        );
    }
}

/**
 * Executes one calendar operation against a connected provider adapter.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const operation = normalizeCalendarEventsOperation(rawBody.operation);
    if (!operation) {
        return NextResponse.json(
            {
                error: 'Invalid operation. Use one of: list_events, get_event, create_event, update_event, delete_event, invite_guests.',
            },
            { status: 400 },
        );
    }

    const connectionId = parsePositiveInteger(rawBody.connectionId);
    const calendarUrl = normalizeOptionalText(rawBody.calendarUrl);

    let connection: CalendarConnectionRecord | null = null;
    try {
        connection = await resolveCalendarConnection({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId,
            calendarUrl,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Calendar connection was not found.' },
            { status: 404 },
        );
    }

    const accessToken = await resolveUseCalendarGoogleToken({
        userId: scopeResult.scope.userId,
        agentPermanentId: scopeResult.scope.agentPermanentId,
    });
    if (!accessToken) {
        return NextResponse.json(
            { error: 'No usable Google Calendar token found. Re-authenticate calendar access first.' },
            { status: 403 },
        );
    }

    const providerAdapter = getCalendarProviderAdapter(connection.provider);
    const calendarId = normalizeOptionalText(rawBody.calendarId) || connection.calendarId;

    try {
        const responsePayload = await executeCalendarOperation({
            operation,
            providerAdapter,
            accessToken,
            calendarId,
            body: rawBody,
        });

        await createCalendarActivity({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId: connection.id,
            provider: connection.provider,
            operation,
            calendarUrl: connection.calendarUrl,
            eventId: responsePayload.eventId || null,
            status: 'success',
            details: {
                request: sanitizeOperationRequest(rawBody),
            },
        });

        return NextResponse.json({
            connection,
            operation,
            ...responsePayload.payload,
        });
    } catch (error) {
        await createCalendarActivity({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            connectionId: connection.id,
            provider: connection.provider,
            operation,
            calendarUrl: connection.calendarUrl,
            status: 'error',
            details: {
                request: sanitizeOperationRequest(rawBody),
                error: error instanceof Error ? error.message : 'calendar_operation_failed',
            },
        }).catch(() => undefined);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Calendar operation failed.' },
            { status: 500 },
        );
    }
}

/**
 * Resolves one active calendar connection for one user+agent.
 */
async function resolveCalendarConnection(options: {
    userId: number;
    agentPermanentId: string;
    connectionId: number | null;
    calendarUrl: string | null;
}): Promise<CalendarConnectionRecord> {
    const activeConnections = await listCalendarConnections({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        provider: 'google',
    });
    if (activeConnections.length === 0) {
        throw new Error('No connected calendar was found for this agent.');
    }

    if (options.connectionId) {
        const connection = activeConnections.find((item) => item.id === options.connectionId);
        if (!connection) {
            throw new Error(`Calendar connection "${options.connectionId}" was not found for this agent.`);
        }

        return connection;
    }

    if (options.calendarUrl) {
        const connection = activeConnections.find((item) => item.calendarUrl === options.calendarUrl);
        if (!connection) {
            throw new Error(`Calendar "${options.calendarUrl}" is not connected for this agent.`);
        }

        return connection;
    }

    return activeConnections[0]!;
}

/**
 * Executes one provider operation and returns response payload + optional event id.
 */
async function executeCalendarOperation(options: {
    operation: CalendarEventsOperation;
    providerAdapter: ReturnType<typeof getCalendarProviderAdapter>;
    accessToken: string;
    calendarId: string;
    body: Record<string, unknown>;
}): Promise<{ payload: Record<string, unknown>; eventId?: string }> {
    const { operation, providerAdapter, accessToken, calendarId, body } = options;

    if (operation === 'list_events') {
        const events = await providerAdapter.listEvents(accessToken, {
            calendarId,
            timeMin: normalizeOptionalText(body.timeMin) || undefined,
            timeMax: normalizeOptionalText(body.timeMax) || undefined,
            query: normalizeOptionalText(body.query) || undefined,
            maxResults: parsePositiveInteger(body.maxResults) || undefined,
            singleEvents: parseOptionalBoolean(body.singleEvents),
            orderBy: normalizeOrderBy(body.orderBy),
            timeZone: normalizeOptionalText(body.timeZone) || undefined,
        });

        return {
            payload: {
                events,
            },
        };
    }

    if (operation === 'get_event') {
        const eventId = requireNonEmptyText(body.eventId, 'eventId');
        const event = await providerAdapter.getEvent(accessToken, calendarId, eventId);
        return {
            payload: {
                event,
            },
            eventId,
        };
    }

    if (operation === 'create_event') {
        const event = await providerAdapter.createEvent(accessToken, {
            calendarId,
            summary: normalizeOptionalText(body.summary) || undefined,
            description: normalizeOptionalText(body.description) || undefined,
            location: normalizeOptionalText(body.location) || undefined,
            start: normalizeOptionalText(body.start) || undefined,
            end: normalizeOptionalText(body.end) || undefined,
            timeZone: normalizeOptionalText(body.timeZone) || undefined,
            attendees: normalizeStringArray(body.attendees),
            reminderMinutes: normalizeNumberArray(body.reminderMinutes),
            sendUpdates: normalizeSendUpdates(body.sendUpdates),
        });

        return {
            payload: {
                event,
            },
            eventId: normalizeOptionalText(event.id) || undefined,
        };
    }

    if (operation === 'update_event') {
        const eventId = requireNonEmptyText(body.eventId, 'eventId');
        const event = await providerAdapter.updateEvent(accessToken, {
            calendarId,
            eventId,
            summary: normalizeOptionalText(body.summary) || undefined,
            description: normalizeOptionalText(body.description) || undefined,
            location: normalizeOptionalText(body.location) || undefined,
            start: normalizeOptionalText(body.start) || undefined,
            end: normalizeOptionalText(body.end) || undefined,
            timeZone: normalizeOptionalText(body.timeZone) || undefined,
            attendees: normalizeStringArray(body.attendees),
            reminderMinutes: normalizeNumberArray(body.reminderMinutes),
            sendUpdates: normalizeSendUpdates(body.sendUpdates),
        });

        return {
            payload: {
                event,
            },
            eventId,
        };
    }

    if (operation === 'delete_event') {
        const eventId = requireNonEmptyText(body.eventId, 'eventId');
        await providerAdapter.deleteEvent(accessToken, {
            calendarId,
            eventId,
            sendUpdates: normalizeSendUpdates(body.sendUpdates),
        });

        return {
            payload: {
                status: 'deleted',
                eventId,
            },
            eventId,
        };
    }

    const eventId = requireNonEmptyText(body.eventId, 'eventId');
    const guests = normalizeStringArray(body.guests);
    if (guests.length === 0) {
        throw new Error('Operation `invite_guests` requires a non-empty `guests` array.');
    }

    const event = await providerAdapter.inviteGuests(accessToken, {
        calendarId,
        eventId,
        guests,
        sendUpdates: normalizeSendUpdates(body.sendUpdates),
    });
    return {
        payload: {
            event,
            invitedGuests: guests,
        },
        eventId,
    };
}

/**
 * Normalizes operation name from one unknown request value.
 */
function normalizeCalendarEventsOperation(value: unknown): CalendarEventsOperation | null {
    const normalizedValue = normalizeOptionalText(value)?.toLowerCase();
    if (
        normalizedValue === 'list_events' ||
        normalizedValue === 'get_event' ||
        normalizedValue === 'create_event' ||
        normalizedValue === 'update_event' ||
        normalizedValue === 'delete_event' ||
        normalizedValue === 'invite_guests'
    ) {
        return normalizedValue;
    }

    return null;
}

/**
 * Keeps only safe operation fields for activity logs.
 */
function sanitizeOperationRequest(value: Record<string, unknown>): SanitizedCalendarOperationRequest {
    return {
        operation: normalizeCalendarEventsOperation(value.operation),
        connectionId: parsePositiveInteger(value.connectionId),
        calendarUrl: normalizeOptionalText(value.calendarUrl),
        calendarId: normalizeOptionalText(value.calendarId),
        eventId: normalizeOptionalText(value.eventId),
        timeMin: normalizeOptionalText(value.timeMin),
        timeMax: normalizeOptionalText(value.timeMax),
    };
}

/**
 * Parses one positive integer from one unknown value.
 */
function parsePositiveInteger(value: unknown): number | null {
    const parsedValue =
        typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return Math.floor(parsedValue);
}

/**
 * Normalizes one optional text value.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

/**
 * Parses one required text field and throws when missing.
 */
function requireNonEmptyText(value: unknown, fieldName: string): string {
    const normalizedValue = normalizeOptionalText(value);
    if (!normalizedValue) {
        throw new Error(`Field "${fieldName}" is required.`);
    }

    return normalizedValue;
}

/**
 * Normalizes unknown value into optional boolean.
 */
function parseOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes') {
        return true;
    }
    if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no') {
        return false;
    }

    return undefined;
}

/**
 * Normalizes unknown value into allowed `orderBy` variant.
 */
function normalizeOrderBy(value: unknown): 'startTime' | 'updated' | undefined {
    const normalizedValue = normalizeOptionalText(value);
    if (normalizedValue === 'startTime' || normalizedValue === 'updated') {
        return normalizedValue;
    }

    return undefined;
}

/**
 * Normalizes unknown value into allowed `sendUpdates` variant.
 */
function normalizeSendUpdates(value: unknown): 'all' | 'externalOnly' | 'none' | undefined {
    const normalizedValue = normalizeOptionalText(value);
    if (normalizedValue === 'all' || normalizedValue === 'externalOnly' || normalizedValue === 'none') {
        return normalizedValue;
    }

    return undefined;
}

/**
 * Normalizes unknown value into unique string list.
 */
function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedValues = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);

    return [...new Set(normalizedValues)];
}

/**
 * Normalizes unknown value into unique integer list.
 */
function normalizeNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedValues = value
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
        .map((item) => Math.max(0, Math.floor(item)));

    return [...new Set(normalizedValues)];
}
