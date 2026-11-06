/*
 * Shared by gateway.js in the browser and the server through src/index.ts, so both apply one rule to `next`.
 * MIT, from @ptbk/gateway-pages.
 */

const MAX_NEXT_PATH_LENGTH = 2048;

const BASE = 'https://gateway.invalid';
/** The engine-owned paths (ENGINE_RESERVED_PATHS); a `next` into them would bounce back into the gateway. */
const RESERVED_PREFIXES = ['/api/', '/auth/', '/setup', '/.well-known/'];

/**
 * Whether `next` is a path on this origin that is safe to navigate to after sign-in, setup or step-up.
 *
 * @param {string} next
 * @returns {boolean}
 */
export function isSafeNextPath(next) {
    if (typeof next !== 'string' || next.length === 0 || next.length > MAX_NEXT_PATH_LENGTH) return false;
    if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return false;
    // The URL parser drops tabs and newlines, so `/\t/evil.example` would become protocol-relative.
    for (let index = 0; index < next.length; index += 1) {
        const code = next.charCodeAt(index);
        if (code < 0x20 || code === 0x7f) return false;
    }
    let url;
    try {
        url = new URL(next, BASE);
    } catch {
        return false;
    }
    if (url.origin !== BASE) return false;
    // After parsing, so `/x/../auth/sign-in` counts as the path it resolves to; the slash makes `/auth` count too.
    const path = `${url.pathname}/`;
    return !RESERVED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
