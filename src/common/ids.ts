import { createHash, randomBytes } from 'node:crypto';

/**
 * Alphabet for short readable identifiers (no ambiguous characters).
 */
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Creates a short random identifier such as `k3x9m2`.
 *
 * @private shared identifier helper
 */
export function shortId(length = 6): string {
    const bytes = randomBytes(length);
    let id = '';
    for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
    return id;
}

/**
 * Creates an unguessable URL-safe secret.
 *
 * @private shared identifier helper
 */
export function secretToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}

/**
 * Stable short hash of a text (hex).
 *
 * @private shared identifier helper
 */
export function shortHash(text: string, length = 10): string {
    return createHash('sha256').update(text).digest('hex').slice(0, length);
}

/**
 * Converts a title into an ASCII slug suitable for file names and IDs.
 *
 * @private shared identifier helper
 */
export function slugify(text: string, maxLength = 48): string {
    const slug = text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const trimmed = slug.slice(0, maxLength).replace(/-+$/g, '');
    return trimmed || 'task';
}
