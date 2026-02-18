import { $randomBase58 } from '../../../../src/utils/random/$randomBase58';

type CookieReader = {
    get(name: string): { value: string } | undefined;
};

type CookieStore = CookieReader & {
    set?: (cookie: { name: string; value: string; httpOnly?: boolean; path?: string; maxAge?: number }) => void;
};

type HeaderReader = Pick<Headers, 'get'>;

/**
 * Cookie name that keeps the current anonymous username on the client.
 */
export const ANONYMOUS_USER_COOKIE_NAME = 'anonymousUsername';

/**
 * Cookie lifetime for anonymous usernames (2 years).
 */
export const ANONYMOUS_USERNAME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

const ANONYMOUS_USER_PREFIX = 'anonymous-';
const ANONYMOUS_ID_LENGTH = 14;
const ANONYMOUS_SUFFIX_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Builds a valid anonymous username by appending the generated suffix to the prefix.
 */
function buildAnonymousUsername(suffix: string): string {
    return `${ANONYMOUS_USER_PREFIX}${suffix}`;
}

/**
 * Creates a new anonymous username that mirrors agent/chat IDs (same length + base58 alphabet).
 */
export function generateAnonymousUsername(): string {
    return buildAnonymousUsername($randomBase58(ANONYMOUS_ID_LENGTH));
}

/**
 * Checks whether the supplied value conforms to the anonymous username pattern.
 */
export function isAnonymousUsername(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    if (!value.startsWith(ANONYMOUS_USER_PREFIX)) {
        return false;
    }

    const suffix = value.slice(ANONYMOUS_USER_PREFIX.length);
    return suffix.length === ANONYMOUS_ID_LENGTH && ANONYMOUS_SUFFIX_PATTERN.test(suffix);
}

/**
 * Reads the anonymous username from the provided cookies object.
 */
export function getAnonymousUsernameFromCookies(cookies: CookieReader): string | null {
    const stored = cookies.get(ANONYMOUS_USER_COOKIE_NAME);
    if (!stored?.value) {
        return null;
    }

    return isAnonymousUsername(stored.value) ? stored.value : null;
}

/**
 * Ensures the anonymous username cookie exists and returns its value.
 */
export function ensureAnonymousUsernameCookie(cookies: CookieStore, preferredUsername?: string): string {
    const existing = getAnonymousUsernameFromCookies(cookies);
    if (existing) {
        return existing;
    }

    const candidate =
        preferredUsername && isAnonymousUsername(preferredUsername) ? preferredUsername : generateAnonymousUsername();
    cookies.set?.({
        name: ANONYMOUS_USER_COOKIE_NAME,
        value: candidate,
        httpOnly: true,
        path: '/',
        maxAge: ANONYMOUS_USERNAME_COOKIE_MAX_AGE_SECONDS,
    });

    return candidate;
}

/**
 * Reads the anonymous username from incoming headers if provided.
 */
export function getAnonymousUsernameFromHeaders(headers: HeaderReader): string | null {
    const value = headers.get('x-anonymous-username');
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    return isAnonymousUsername(normalized) ? normalized : null;
}
