import type { string_uuid } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Checks if value is valid uuid
 * 
 * @public exported from `@promptbook/utils`
 */
export function isValidUuid(value: really_unknown): value is string_uuid {
    if (typeof value !== 'string') {
        return false;
    }

    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
}
