/**
 * Byte encodings of the App platform protocol (`@ptbk/protocol` in `webgptorg/app`, ported natively because `ptbk`
 * ships without runtime dependencies). Each byte string has exactly one accepted encoding: decoders refuse anything
 * an encoder would not produce, so a signed value can never be read two ways.
 */

/**
 * Alphabet of RFC 4648 §5 base64url.
 */
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Character code → 6-bit value of base64url, or -1.
 */
const BASE64URL_VALUES = new Int8Array(128).fill(-1);
for (let value = 0; value < BASE64URL_ALPHABET.length; value++) BASE64URL_VALUES[BASE64URL_ALPHABET.charCodeAt(value)] = value;

/**
 * Lowercase RFC 4648 §6 base32 alphabet (engine IDs and link codes).
 */
const BASE32_LOWER_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/**
 * Crockford base32 alphabet of the engine fingerprint code.
 */
const CROCKFORD_BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encodes bytes as RFC 4648 §5 base64url without padding.
 *
 * @private App platform protocol
 */
export function encodeBase64Url(bytes: Uint8Array): string {
    let text = '';
    for (let index = 0; index < bytes.length; index += 3) {
        const chunk = ((bytes[index] ?? 0) << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
        const chars = Math.min(bytes.length - index, 3) + 1;
        for (let char = 0; char < chars; char++) text += BASE64URL_ALPHABET.charAt((chunk >>> (18 - 6 * char)) & 0x3f);
    }
    return text;
}

/**
 * Decodes canonical base64url: no padding, `+`, `/` or whitespace, no length ≡ 1 (mod 4) and zero unused trailing
 * bits. Returns `undefined` for anything else.
 *
 * @private App platform protocol
 */
export function decodeBase64Url(text: string): Uint8Array | undefined {
    if (text.length % 4 === 1) return undefined;
    const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
    let buffer = 0;
    let bits = 0;
    let offset = 0;
    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index);
        const value = code < 128 ? (BASE64URL_VALUES[code] ?? -1) : -1;
        if (value < 0) return undefined;
        buffer = ((buffer << 6) | value) & 0xfff;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes[offset++] = (buffer >>> bits) & 0xff;
        }
    }
    if ((buffer & ((1 << bits) - 1)) !== 0) return undefined;
    return bytes;
}

/**
 * Whether a text is the canonical base64url of exactly `length` bytes.
 *
 * @private App platform protocol
 */
export function isBase64UrlOfLength(text: unknown, length: number): text is string {
    if (typeof text !== 'string' || text.length !== Math.ceil((length * 4) / 3)) return false;
    return decodeBase64Url(text)?.length === length;
}

/**
 * Encodes bytes as lowercase RFC 4648 base32 without padding.
 *
 * @private App platform protocol
 */
export function encodeBase32Lower(bytes: Uint8Array): string {
    let text = '';
    let buffer = 0;
    let bits = 0;
    for (const byte of bytes) {
        buffer = ((buffer << 8) | byte) & 0xfff;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            text += BASE32_LOWER_ALPHABET.charAt((buffer >>> bits) & 0x1f);
        }
    }
    if (bits > 0) text += BASE32_LOWER_ALPHABET.charAt((buffer << (5 - bits)) & 0x1f);
    return text;
}

/**
 * Encodes a string of `0`/`1` bits (a multiple of five long) in Crockford base32.
 *
 * @private App platform protocol
 */
export function encodeCrockfordBits(bits: string): string {
    let text = '';
    for (let offset = 0; offset + 5 <= bits.length; offset += 5) text += CROCKFORD_BASE32_ALPHABET.charAt(Number.parseInt(bits.slice(offset, offset + 5), 2));
    return text;
}

/**
 * UTF-8 bytes of a text.
 *
 * @private App platform protocol
 */
export function utf8(text: string): Uint8Array {
    return new Uint8Array(Buffer.from(text, 'utf8'));
}

/**
 * Concatenates byte strings.
 *
 * @private App platform protocol
 */
export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}
