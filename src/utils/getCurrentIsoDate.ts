import type { string_date_iso8601 } from './../types/typeAliases';

/**
 * Get current date in ISO 8601 format
 *
 * @private This is internal util of the promptbook
 */
export function getCurrentIsoDate(): string_date_iso8601 {
    return new Date().toISOString() as string_date_iso8601;
}
