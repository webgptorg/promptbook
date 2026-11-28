'use client';

/**
 * Header carrying stable anonymous username for browser-originated API calls.
 */
const ANONYMOUS_USERNAME_HEADER_NAME = 'x-anonymous-username';

/**
 * Browser storage key for stable anonymous username across refreshes.
 */
const ANONYMOUS_USERNAME_STORAGE_KEY = 'agents-server-anonymous-username';

/**
 * Prefix used by server-side anonymous user validation.
 */
const ANONYMOUS_USERNAME_PREFIX = 'anonymous-';

/**
 * Number of random base58 characters appended to anonymous username prefix.
 */
const ANONYMOUS_USERNAME_SUFFIX_LENGTH = 14;

/**
 * Base58 alphabet used by anonymous user ids.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Pattern accepted by server-side anonymous username validation.
 */
const ANONYMOUS_USERNAME_PATTERN = /^anonymous-[1-9A-HJ-NP-Za-km-z]{14}$/;

/**
 * Cached anonymous username resolved in the current browser tab.
 */
let cachedAnonymousUsername: string | null | undefined;

/**
 * Returns true when the provided value matches the anonymous username format.
 */
function isAnonymousUsername(value: unknown): value is string {
    return typeof value === 'string' && ANONYMOUS_USERNAME_PATTERN.test(value);
}

/**
 * Generates a deterministic-length base58 suffix.
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
 * Creates one stable anonymous username aligned with the server-side format.
 */
function generateAnonymousUsername(): string {
    return `${ANONYMOUS_USERNAME_PREFIX}${generateBase58Suffix(ANONYMOUS_USERNAME_SUFFIX_LENGTH)}`;
}

/**
 * Resolves stable anonymous username and stores it in browser localStorage.
 *
 * @private shared helper for the Agents Server browser client
 */
export function getOrCreateAnonymousUsername(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (cachedAnonymousUsername !== undefined) {
        return cachedAnonymousUsername;
    }

    try {
        const storedAnonymousUsername = window.localStorage.getItem(ANONYMOUS_USERNAME_STORAGE_KEY);
        if (isAnonymousUsername(storedAnonymousUsername)) {
            cachedAnonymousUsername = storedAnonymousUsername;
            return cachedAnonymousUsername;
        }
    } catch {
        // Ignore storage errors and fall back to in-memory generation.
    }

    const generatedAnonymousUsername = generateAnonymousUsername();
    cachedAnonymousUsername = generatedAnonymousUsername;

    try {
        window.localStorage.setItem(ANONYMOUS_USERNAME_STORAGE_KEY, generatedAnonymousUsername);
    } catch {
        // Ignore storage errors. The in-memory value is still stable for this tab.
    }

    return cachedAnonymousUsername;
}

/**
 * Creates request headers for browser API calls with stable anonymous identity.
 *
 * @private shared helper for the Agents Server browser client
 */
export function createAnonymousUserRequestHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const anonymousUsername = getOrCreateAnonymousUsername();

    if (anonymousUsername) {
        headers.set(ANONYMOUS_USERNAME_HEADER_NAME, anonymousUsername);
    }

    return headers;
}
