import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { UseCalendarToolNames } from './UseCalendarToolNames';

/**
 * Shared calendar URL argument description used in USE CALENDAR tool schemas.
 *
 * @private constant of createUseCalendarTools
 */
const CALENDAR_URL_PARAMETER_DESCRIPTION =
    'Google Calendar URL configured by USE CALENDAR (for example "https://calendar.google.com/...").';

/**
 * Shared schema for string arrays used by USE CALENDAR tools.
 *
 * @private constant of createUseCalendarTools
 */
const STRING_ARRAY_ITEMS_SCHEMA = {
    type: 'string',
} as const;

/**
 * Shared schema for integer arrays used by USE CALENDAR tools.
 *
 * @private constant of createUseCalendarTools
 */
const INTEGER_ARRAY_ITEMS_SCHEMA = {
    type: 'integer',
} as const;

/**
 * Shared `sendUpdates` schema used by USE CALENDAR tools.
 *
 * @private constant of createUseCalendarTools
 */
const SEND_UPDATES_PARAMETER_SCHEMA = {
    type: 'string',
    description: 'Guest update policy ("all", "externalOnly", "none").',
    enum: ['all', 'externalOnly', 'none'],
} satisfies LlmToolDefinition['parameters']['properties'][string];

/**
 * Creates an array parameter schema with explicit item definition so OpenAI accepts it.
 *
 * @private function of createUseCalendarTools
 */
function createArrayParameterSchema(
    description: string,
    items: NonNullable<LlmToolDefinition['parameters']['properties'][string]['items']>,
): LlmToolDefinition['parameters']['properties'][string] {
    return {
        type: 'array',
        description,
        items,
    };
}

/**
 * Adds USE CALENDAR tool definitions while keeping already registered tools untouched.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
export function createUseCalendarTools(existingTools: ReadonlyArray<LlmToolDefinition>): Array<LlmToolDefinition> {
    const updatedTools = [...existingTools];

    const addToolIfMissing = (tool: LlmToolDefinition): void => {
        if (!updatedTools.some((existingTool) => existingTool.name === tool.name)) {
            updatedTools.push(tool);
        }
    };

    addToolIfMissing({
        name: UseCalendarToolNames.listEvents,
        description: 'List events from a configured calendar for a time range.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                timeMin: {
                    type: 'string',
                    description: 'Inclusive event start bound in ISO datetime.',
                },
                timeMax: {
                    type: 'string',
                    description: 'Exclusive event end bound in ISO datetime.',
                },
                query: {
                    type: 'string',
                    description: 'Optional free-text event search query.',
                },
                maxResults: {
                    type: 'integer',
                    description: 'Maximum number of events to return.',
                },
                singleEvents: {
                    type: 'boolean',
                    description: 'Expand recurring events into individual instances.',
                },
                orderBy: {
                    type: 'string',
                    description: 'Optional ordering ("startTime" or "updated").',
                },
                timeZone: {
                    type: 'string',
                    description: 'Optional IANA timezone for response rendering.',
                },
            },
            required: [],
        },
    });

    addToolIfMissing({
        name: UseCalendarToolNames.getEvent,
        description: 'Get one event by id from a configured calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                eventId: {
                    type: 'string',
                    description: 'Google Calendar event id.',
                },
            },
            required: ['eventId'],
        },
    });

    addToolIfMissing({
        name: UseCalendarToolNames.createEvent,
        description: 'Create one event in a configured calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                summary: {
                    type: 'string',
                    description: 'Event title/summary.',
                },
                description: {
                    type: 'string',
                    description: 'Optional event description.',
                },
                location: {
                    type: 'string',
                    description: 'Optional event location.',
                },
                start: {
                    type: 'string',
                    description: 'Event start as ISO datetime or date.',
                },
                end: {
                    type: 'string',
                    description: 'Event end as ISO datetime or date.',
                },
                timeZone: {
                    type: 'string',
                    description: 'Optional timezone for datetime values.',
                },
                attendees: createArrayParameterSchema('Optional guest email list.', STRING_ARRAY_ITEMS_SCHEMA),
                reminderMinutes: createArrayParameterSchema(
                    'Optional popup reminder minute offsets.',
                    INTEGER_ARRAY_ITEMS_SCHEMA,
                ),
                sendUpdates: SEND_UPDATES_PARAMETER_SCHEMA,
            },
            required: ['summary', 'start', 'end'],
        },
    });

    addToolIfMissing({
        name: UseCalendarToolNames.updateEvent,
        description: 'Update one existing event in a configured calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                eventId: {
                    type: 'string',
                    description: 'Google Calendar event id.',
                },
                summary: {
                    type: 'string',
                    description: 'Updated event summary.',
                },
                description: {
                    type: 'string',
                    description: 'Updated event description.',
                },
                location: {
                    type: 'string',
                    description: 'Updated event location.',
                },
                start: {
                    type: 'string',
                    description: 'Updated event start as ISO datetime or date.',
                },
                end: {
                    type: 'string',
                    description: 'Updated event end as ISO datetime or date.',
                },
                timeZone: {
                    type: 'string',
                    description: 'Optional timezone for datetime values.',
                },
                attendees: createArrayParameterSchema(
                    'Optional replacement guest email list.',
                    STRING_ARRAY_ITEMS_SCHEMA,
                ),
                reminderMinutes: createArrayParameterSchema(
                    'Optional replacement popup reminder minute offsets.',
                    INTEGER_ARRAY_ITEMS_SCHEMA,
                ),
                sendUpdates: SEND_UPDATES_PARAMETER_SCHEMA,
            },
            required: ['eventId'],
        },
    });

    addToolIfMissing({
        name: UseCalendarToolNames.deleteEvent,
        description: 'Delete one event from a configured calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                eventId: {
                    type: 'string',
                    description: 'Google Calendar event id.',
                },
                sendUpdates: SEND_UPDATES_PARAMETER_SCHEMA,
            },
            required: ['eventId'],
        },
    });

    addToolIfMissing({
        name: UseCalendarToolNames.inviteGuests,
        description: 'Add guests to an existing event in a configured calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarUrl: {
                    type: 'string',
                    description: CALENDAR_URL_PARAMETER_DESCRIPTION,
                },
                eventId: {
                    type: 'string',
                    description: 'Google Calendar event id.',
                },
                guests: createArrayParameterSchema('Guest email list to add to the event.', STRING_ARRAY_ITEMS_SCHEMA),
                sendUpdates: SEND_UPDATES_PARAMETER_SCHEMA,
            },
            required: ['eventId', 'guests'],
        },
    });

    return updatedTools;
}
