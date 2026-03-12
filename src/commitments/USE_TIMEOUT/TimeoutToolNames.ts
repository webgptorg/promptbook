import type { string_javascript_name } from '../../_packages/types.index';

/**
 * Tool names provided by the `USE TIMEOUT` commitment.
 *
 * @private internal USE TIMEOUT constant
 */
export const TimeoutToolNames = {
    set: 'set_timeout' as string_javascript_name,
    cancel: 'cancel_timeout' as string_javascript_name,
} as const;
