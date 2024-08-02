import type { string_email } from '../../../types/typeAliases';
import { really_unknown } from '../../organization/really_unknown';

/**
 * Checks if value is valid email
 */
export function isValidEmail(email: really_unknown): email is string_email {
    if (typeof email !== 'string') {
        return false;
    }

    return /^.+@.+\..+$/.test(email);
}
