import { timingSafeEqual } from 'crypto';

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Plain JavaScript `===` / `!==` string comparisons short-circuit on the first
 * byte that differs, which lets a remote attacker who can measure response
 * timing recover the expected value one byte at a time. This helper performs
 * the comparison through Node's `timingSafeEqual`, which always inspects every
 * byte of the equal-length buffers.
 *
 * Returning `false` early when the byte lengths differ does not expose
 * character content — only length — which is an acceptable trade-off, since
 * `timingSafeEqual` requires equal-length buffers and length is typically not
 * secret.
 *
 * `null` and `undefined` inputs are treated as non-matching so callers can
 * forward raw request values (for example `request.headers.get(name)`) without
 * an extra guard.
 *
 * @param candidate - Value supplied by the caller (for example a request header or cookie).
 * @param expected - Value to compare against (for example a configured secret).
 * @returns `true` when both values are strings of equal length with identical bytes.
 *
 * @private internal helper function
 */
export function isTimingSafeEqualString(
    candidate: string | null | undefined,
    expected: string | null | undefined,
): boolean {
    if (typeof candidate !== 'string' || typeof expected !== 'string') {
        return false;
    }

    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);

    if (candidateBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(candidateBuffer, expectedBuffer);
}
