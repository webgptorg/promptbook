import { PRIVATE_MODE_COOKIE_NAME } from '@/src/constants/privateMode';

/**
 * Parses the cookie header into a normalized lookup table.
 *
 * @param cookieHeader - Raw Cookie header value.
 * @returns Map of cookie names to their decoded values.
 * @private Internal helper shared by private mode utilities.
 */
function parseCookieHeader(cookieHeader?: string | null): Record<string, string> {
    if (!cookieHeader) {
        return {};
    }

    const cookies: Record<string, string> = {};
    const segments = cookieHeader.split(';');

    for (const segment of segments) {
        const [rawName, ...rawValueParts] = segment.split('=');
        if (!rawName) {
            continue;
        }

        const name = rawName.trim();
        if (!name) {
            continue;
        }

        const rawValue = rawValueParts.join('=');
        const value = rawValue ? decodeURIComponent(rawValue).trim() : '';
        cookies[name] = value;
    }

    return cookies;
}

/**
 * Determines whether private mode was requested via the provided cookie header.
 *
 * @param cookieHeader - Value of the `Cookie` header.
 * @returns True when private mode is enabled in the cookie.
 * @private Internal helper for private mode guards.
 */
export function isPrivateModeEnabledFromCookieHeader(cookieHeader?: string | null): boolean {
    const cookies = parseCookieHeader(cookieHeader);
    const rawValue = cookies[PRIVATE_MODE_COOKIE_NAME];
    if (!rawValue) {
        return false;
    }

    const normalized = rawValue.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
}

/**
 * Determines whether private mode is enabled from the supplied headers collection.
 *
 * @param headers - Headers instance or init object.
 * @returns True when private mode cookie is present and enabled.
 * @private Internal helper for private mode guards.
 */
export function isPrivateModeEnabledFromHeaders(headers?: Headers | HeadersInit | null): boolean {
    if (!headers) {
        return false;
    }

    const headerBag = headers instanceof Headers ? headers : new Headers(headers);
    return isPrivateModeEnabledFromCookieHeader(headerBag.get('cookie'));
}

/**
 * Determines whether private mode is enabled for a fetch request.
 *
 * @param request - HTTP request sent by the browser.
 * @returns True when the request carries the private mode cookie.
 * @private Internal helper for private mode guards.
 */
export function isPrivateModeEnabledFromRequest(request?: Request | null): boolean {
    if (!request) {
        return false;
    }

    return isPrivateModeEnabledFromHeaders(request.headers);
}
