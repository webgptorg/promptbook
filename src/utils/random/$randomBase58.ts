import { randomBytes } from 'crypto';

/**
 * Base58 characters
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Generates random base58 string
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: This function is cryptographically secure (it uses crypto.randomBytes internally)
 *
 * @param length - length of the string
 * @returns secure random base58 string
 */
export function $randomBase58(length: number): string {
    let result = '';
    while (result.length < length) {
        // Generate enough bytes to cover the remaining length, plus some extra buffer to reduce calls
        // But simply generating `length - result.length` is fine for small lengths
        const bytes = randomBytes(length - result.length); 
        
        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i]!;

            // 58 * 4 = 232
            // We discard values >= 232 to avoid modulo bias
            if (byte < 232) {
                result += BASE58_ALPHABET[byte % 58];
                if (result.length === length) break;
            }
        }
    }
    return result;
}
