/**
 * Parses the X-Frame-Options header value and returns whether embedding is allowed.
 *
 * Some servers set multiple values (e.g. "DENY, SAMEORIGIN") which results in a
 * comma-separated string. Any DENY or SAMEORIGIN token blocks embedding.
 */
function canEmbedByXFrameOptions(headerValue: string): boolean {
    const values = headerValue
        .split(',')
        .map((v) => v.trim().toUpperCase());
    return !values.some((v) => v === 'DENY' || v === 'SAMEORIGIN');
}

/**
 * Parses the Content-Security-Policy header and checks the `frame-ancestors` directive.
 *
 * Returns false when `frame-ancestors` is present and does not include a wildcard or
 * protocol-level allow (`*`, `https:`, `http:`).
 */
function canEmbedByCsp(cspHeader: string): boolean {
    const match = cspHeader.match(/frame-ancestors\s+([^;]+)/i);
    if (!match) {
        return true;
    }

    const directive = (match[1] ?? '').trim();
    const tokens = directive.split(/\s+/);

    for (const token of tokens) {
        if (token === '*' || token === 'https:' || token === 'http:') {
            return true;
        }
    }

    return false;
}

/**
 * Checks whether a given HTTP(S) URL allows being embedded in an iframe by
 * inspecting `X-Frame-Options` and `Content-Security-Policy` `frame-ancestors`.
 *
 * Returns `true` when the page is embeddable, `false` when it is blocked.
 * Throws when the URL is not HTTP(S) or the network request fails.
 */
export async function checkIfUrlCanBeEmbedded(url: string): Promise<boolean> {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error(`Only http and https URLs are supported, got: ${parsedUrl.protocol}`);
    }

    const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
    });

    const xFrameOptions = response.headers.get('X-Frame-Options');
    if (xFrameOptions !== null && !canEmbedByXFrameOptions(xFrameOptions)) {
        return false;
    }

    const csp = response.headers.get('Content-Security-Policy');
    if (csp !== null && !canEmbedByCsp(csp)) {
        return false;
    }

    return true;
}
