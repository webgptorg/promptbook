import type { string_email } from '../../../types/typeAliases';

/**
 * Checks if value is valid email
 */
export function isValidEmail(value: unknown): value is string_email {
    if (typeof value !== 'string') {
        return false;
    }

    return /^.+@.+\..+$/.test(value);
}
