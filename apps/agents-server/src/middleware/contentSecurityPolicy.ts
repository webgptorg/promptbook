import type { NextResponse } from 'next/server';

/**
 * Name of the request header that carries the per-request CSP nonce to server components.
 *
 * Server components read it via `next/headers` and must pass it to every inline `<script>` tag so
 * the browser executes only scripts explicitly rendered by the server.
 *
 * @private function of middleware
 */
export const CONTENT_SECURITY_POLICY_NONCE_REQUEST_HEADER = 'x-csp-nonce';

/**
 * Length (in bytes) of the random material used to derive each per-request CSP nonce.
 *
 * 16 bytes (128 bits) is the value recommended by the W3C CSP3 specification — large enough to
 * make guessing infeasible while keeping the base64 representation short.
 *
 * @private function of middleware
 */
const CONTENT_SECURITY_POLICY_NONCE_BYTE_LENGTH = 16;

/**
 * Generates a fresh, single-use CSP nonce encoded as base64.
 *
 * @returns Cryptographically random nonce safe to inline into a CSP header.
 *
 * @private function of middleware
 */
export function generateContentSecurityPolicyNonce(): string {
    const randomBytes = new Uint8Array(CONTENT_SECURITY_POLICY_NONCE_BYTE_LENGTH);
    crypto.getRandomValues(randomBytes);

    let binaryString = '';
    for (const byte of randomBytes) {
        binaryString += String.fromCharCode(byte);
    }

    // Note: `btoa` is available in the Next.js Edge runtime where this middleware executes.
    return btoa(binaryString);
}

/**
 * Builds the strict Content Security Policy header value for the given nonce.
 *
 * The policy locks down `script-src` to nonced inline scripts and scripts loaded by them
 * (`'strict-dynamic'`). The legacy fallbacks (`'unsafe-inline'`, `http:`, `https:`) are ignored
 * by modern browsers that honor the nonce, but keep the page functional in older browsers
 * without weakening security in modern ones.
 *
 * @param nonce - Per-request CSP nonce.
 * @returns Serialized CSP header value.
 *
 * @private function of middleware
 */
function buildContentSecurityPolicyHeaderValue(nonce: string): string {
    const directives = [
        `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval' https: http:`,
        `object-src 'none'`,
        `base-uri 'self'`,
    ];

    return directives.join('; ');
}

/**
 * Adds the CSP nonce headers to the forwarded request so server components and the Next.js
 * runtime can detect the nonce and apply it to their own inline scripts.
 *
 * @param requestHeaders - Mutable headers object that is forwarded to the route handler.
 * @param nonce - Per-request CSP nonce.
 *
 * @private function of middleware
 */
export function applyContentSecurityPolicyToRequestHeaders(requestHeaders: Headers, nonce: string): void {
    requestHeaders.set(CONTENT_SECURITY_POLICY_NONCE_REQUEST_HEADER, nonce);

    // Note: Next.js detects the nonce automatically when the CSP is also present on the
    //       forwarded request headers — see https://nextjs.org/docs/app/guides/content-security-policy
    requestHeaders.set('Content-Security-Policy', buildContentSecurityPolicyHeaderValue(nonce));
}

/**
 * Adds the strict CSP response header so the browser enforces the nonced script policy.
 *
 * Helpers that add narrower directives (e.g. `applyEmbeddingHeader` with `frame-ancestors`)
 * must `append` a separate CSP header rather than `set` so the strict `script-src` policy is
 * preserved.
 *
 * @param response - Outgoing response.
 * @param nonce - Per-request CSP nonce.
 *
 * @private function of middleware
 */
export function applyContentSecurityPolicyHeader(response: NextResponse, nonce: string): void {
    response.headers.set('Content-Security-Policy', buildContentSecurityPolicyHeaderValue(nonce));
}
