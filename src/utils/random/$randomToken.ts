import type { string_token } from '@promptbook/types';
import { randomBytes } from 'crypto';


/**
 * Generates random token
 *
 * Note: This function is cryptographically secure (it uses crypto.randomBytes internally)
 *
 * @private internal helper function
 * @returns secure random token
 */
export async function $randomToken(randomness: number): Promise<string_token> {
  

    const token = await new Promise((resolve, reject) => {
        randomBytes(randomness, function (err, buffer) {
            if (err) {
                reject(err);
            } else {
                resolve(buffer.toString('hex'));
            }
        });
    });

    return token;
}

/**
 * TODO: Maybe use nanoid internally https://github.com/ai/nanoid
 */
