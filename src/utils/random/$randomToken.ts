import { randomBytes } from 'crypto';
import type { string_token } from '../../types/typeAliases';

/**
 * Generates random token
 *
 * Note: This function is cryptographically secure (it uses crypto.randomBytes internally)
 *
 * @private internal helper function
 * @returns secure random token
 */
export function $randomToken(randomness: number): string_token {
    return randomBytes(randomness).toString('hex');
}

/**
 * TODO: Maybe use nanoid instead https://github.com/ai/nanoid
 */
