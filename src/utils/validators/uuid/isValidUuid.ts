import type { string_uuid } from '../../../types/string_sha256';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Checks if value is valid uuid
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidUuid(value: really_unknown): value is string_uuid {
    if (typeof value !== 'string') {
        return false;
    }

    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
}
