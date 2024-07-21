import type { string_email } from '../../../types/typeAliases';

/**
 * Checks if value is valid email
 */
export function isValidEmail(email: unknown): email is string_email {
    if (typeof email !== 'string') {
        return false;
    }

    return /^.+@.+\..+$/.test(email);
}
