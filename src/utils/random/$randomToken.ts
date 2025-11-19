import { randomBytes } from 'crypto';
import type { string_token } from '../../types/typeAliases';

/**
 * Generates random token
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: This function is cryptographically secure (it uses crypto.randomBytes internally)
 *
 * @private internal helper function
 * @returns secure random token
 */
export function $randomToken(randomness: number): string_token {
    return randomBytes(randomness).toString('hex');
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 * TODO: Maybe use nanoid instead https://github.com/ai/nanoid
 */
