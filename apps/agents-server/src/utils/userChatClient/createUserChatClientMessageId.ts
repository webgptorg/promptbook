'use client';

/**
 * Base58 alphabet used by anonymous user IDs.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Generates a random base58 suffix with deterministic length.
 */
function generateBase58Suffix(length: number): string {
    const randomValues = new Uint32Array(length);

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        globalThis.crypto.getRandomValues(randomValues);
    } else {
        for (let index = 0; index < randomValues.length; index++) {
            randomValues[index] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        }
    }

    return Array.from(randomValues, (value) => BASE58_ALPHABET[value % BASE58_ALPHABET.length]).join('');
}

/**
 * Creates one stable client-generated deduplication key for durable message sends.
 *
 * @private shared helper for the Agents Server browser client
 */
export function createUserChatClientMessageId(): string {
    return generateBase58Suffix(18);
}
