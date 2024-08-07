import type { string_date_iso8601 } from '../types/typeAliases';

/**
 * Simple wrapper `new Date().toISOString()`
 *
 * @returns string_date branded type
 * @public exported from `@promptbook/utils`
 */
export function $currentDate(): string_date_iso8601 {
    return new Date().toISOString() as string_date_iso8601;
}
