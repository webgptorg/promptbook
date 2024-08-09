import type { string_date_iso8601 } from '../types/typeAliases';

/**
 * Get current date in ISO 8601 format
 *
 * @private internal utility
 */
export function getCurrentIsoDate(): string_date_iso8601 {
    return new Date().toISOString() as string_date_iso8601;
}
