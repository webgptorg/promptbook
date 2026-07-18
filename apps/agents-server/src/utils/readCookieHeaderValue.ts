/**
 * Reads one decoded cookie value from a raw `Cookie` header.
 *
 * @param cookieHeader - Raw `Cookie` header value.
 * @param cookieName - Cookie name to read.
 * @returns Decoded cookie value or `null`.
 *
 * @private Internal HTTP cookie helper.
 */
export function readCookieHeaderValue(
    cookieHeader: string | string[] | null | undefined,
    cookieName: string,
): string | null {
    const normalizedCookieHeader = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader || '';

    for (const cookiePart of normalizedCookieHeader.split(';')) {
        const [rawName, ...rawValueParts] = cookiePart.split('=');
        if (rawName?.trim() !== cookieName) {
            continue;
        }

        const rawValue = rawValueParts.join('=').trim();
        if (!rawValue) {
            return null;
        }

        try {
            return decodeURIComponent(rawValue);
        } catch {
            return rawValue;
        }
    }

    return null;
}
