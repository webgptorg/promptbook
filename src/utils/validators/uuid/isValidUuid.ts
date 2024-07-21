import { string_uuid } from '../../../types/typeAliases';

/**
 * Checks if value is valid uuid
 */
export function isValidUuid(value: unknown): value is string_uuid {
    if (typeof value !== 'string') {
        return false;
    }

    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
}
