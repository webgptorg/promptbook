import type { string_javascript_name } from '../../types/string_person_fullname';

/**
 * Tool names provided by the `USE TIMEOUT` commitment.
 *
 * @private internal USE TIMEOUT constant
 */
export const TimeoutToolNames = {
    set: 'set_timeout' as string_javascript_name,
    cancel: 'cancel_timeout' as string_javascript_name,
    list: 'list_timeouts' as string_javascript_name,
    update: 'update_timeout' as string_javascript_name,
} as const;
