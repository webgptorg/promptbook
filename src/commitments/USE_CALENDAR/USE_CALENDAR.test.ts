import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import { UseCalendarCommitmentDefinition } from './USE_CALENDAR';

describe('USE CALENDAR commitment', () => {
    const commitment = new UseCalendarCommitmentDefinition();
    const basicRequirements = createBasicAgentModelRequirements('test-agent');
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('has correct type and aliases', () => {
        expect(commitment.type).toBe('USE CALENDAR');
        expect(commitment.aliases).toEqual(['CALENDAR']);
    });

    it('adds calendar tools and metadata when applied', () => {
        const result = commitment.applyToAgentModelRequirements(
            basicRequirements,
            'https://calendar.google.com/calendar/u/0/r',
        );
        const createEventTool = result.tools?.find((tool) => tool.name === 'calendar_create_event');
        const updateEventTool = result.tools?.find((tool) => tool.name === 'calendar_update_event');
        const inviteGuestsTool = result.tools?.find((tool) => tool.name === 'calendar_invite_guests');

        expect(result._metadata?.useCalendar).toBe(true);
        expect(result._metadata?.useCalendars).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provider: 'google',
                    calendarId: 'primary',
                }),
            ]),
        );
        expect(result.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'calendar_list_events' }),
                expect.objectContaining({ name: 'calendar_get_event' }),
                expect.objectContaining({ name: 'calendar_create_event' }),
                expect.objectContaining({ name: 'calendar_update_event' }),
                expect.objectContaining({ name: 'calendar_delete_event' }),
                expect.objectContaining({ name: 'calendar_invite_guests' }),
            ]),
        );
        expect(createEventTool?.parameters.properties.attendees).toEqual(
            expect.objectContaining({
                type: 'array',
                items: expect.objectContaining({ type: 'string' }),
            }),
        );
        expect(createEventTool?.parameters.properties.reminderMinutes).toEqual(
            expect.objectContaining({
                type: 'array',
                items: expect.objectContaining({ type: 'integer' }),
            }),
        );
        expect(updateEventTool?.parameters.properties.attendees).toEqual(
            expect.objectContaining({
                type: 'array',
                items: expect.objectContaining({ type: 'string' }),
            }),
        );
        expect(inviteGuestsTool?.parameters.properties.guests).toEqual(
            expect.objectContaining({
                type: 'array',
                items: expect.objectContaining({ type: 'string' }),
            }),
        );
    });

    it('returns wallet-credential-required result when calendar token is missing', async () => {
        const toolFunctions = commitment.getToolFunctions();
        const listEventsTool = toolFunctions.calendar_list_events!;

        const resultRaw = await listEventsTool({
            calendarUrl: 'https://calendar.google.com/calendar/u/0/r',
        });
        const result = JSON.parse(resultRaw) as {
            action?: string;
            status?: string;
            service?: string;
            key?: string;
            provider?: string;
            calendarUrl?: string;
            scopes?: string[];
        };

        expect(result.action).toBe('calendar-auth');
        expect(result.status).toBe('wallet-credential-required');
        expect(result.service).toBe('google_calendar');
        expect(result.key).toBe('use-calendar-google-token');
        expect(result.provider).toBe('google');
        expect(result.calendarUrl).toBe('https://calendar.google.com/calendar/u/0/r');
        expect(Array.isArray(result.scopes)).toBe(true);
    });

    it('lists calendar events through Google Calendar API', async () => {
        const fetchMock = jest.fn(async () => {
            return new Response(
                JSON.stringify({
                    items: [
                        {
                            id: 'event-1',
                            summary: 'Weekly sync',
                            status: 'confirmed',
                        },
                    ],
                }),
                {
                    status: 200,
                    statusText: 'OK',
                },
            );
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const toolFunctions = commitment.getToolFunctions();
        const listEventsTool = toolFunctions.calendar_list_events!;
        const resultText = await listEventsTool({
            calendarUrl: 'https://calendar.google.com/calendar/u/0/r',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                calendars: {
                    googleAccessToken: 'google_access_token',
                    connections: [
                        {
                            provider: 'google',
                            url: 'https://calendar.google.com/calendar/u/0/r',
                            calendarId: 'primary',
                            scopes: ['https://www.googleapis.com/auth/calendar'],
                        },
                    ],
                },
            }),
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/calendars/primary/events'),
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: 'Bearer google_access_token',
                }),
            }),
        );

        const result = JSON.parse(resultText) as {
            calendarId?: string;
            events?: Array<{ id?: string; summary?: string }>;
        };
        expect(result.calendarId).toBe('primary');
        expect(result.events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'event-1',
                    summary: 'Weekly sync',
                }),
            ]),
        );
    });
});
