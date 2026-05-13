import type { string_javascript_name } from '../../types/string_person_fullname';

/**
 * Names of tools used by the USE CALENDAR commitment.
 *
 * @private constant of UseCalendarCommitmentDefinition
 */
export const UseCalendarToolNames = {
    listEvents: 'calendar_list_events' as string_javascript_name,
    getEvent: 'calendar_get_event' as string_javascript_name,
    createEvent: 'calendar_create_event' as string_javascript_name,
    updateEvent: 'calendar_update_event' as string_javascript_name,
    deleteEvent: 'calendar_delete_event' as string_javascript_name,
    inviteGuests: 'calendar_invite_guests' as string_javascript_name,
} as const;
