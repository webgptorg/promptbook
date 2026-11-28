import type { string_javascript_name } from '../../types/string_person_fullname';
import { UseCalendarToolNames } from './UseCalendarToolNames';

/**
 * Gets human-readable tool labels for USE CALENDAR functions.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
export function getUseCalendarToolTitles(): Record<string_javascript_name, string> {
    return {
        [UseCalendarToolNames.listEvents]: 'List calendar events',
        [UseCalendarToolNames.getEvent]: 'Get calendar event',
        [UseCalendarToolNames.createEvent]: 'Create calendar event',
        [UseCalendarToolNames.updateEvent]: 'Update calendar event',
        [UseCalendarToolNames.deleteEvent]: 'Delete calendar event',
        [UseCalendarToolNames.inviteGuests]: 'Invite calendar guests',
    };
}
