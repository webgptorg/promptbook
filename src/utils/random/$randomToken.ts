import { randomBytes } from 'crypto';
import type { string_token } from '../../types/string_token';

/**
 * Generates random token
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: This function is cryptographically secure (it uses crypto.randomBytes internally)
 *
 * @returns secure random token
 *
 * @private internal helper function
 */
export function $randomToken(randomness: number): string_token {
    return randomBytes(randomness).toString('hex');
}

// TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
// TODO: Maybe use nanoid instead https://github.com/ai/nanoid
