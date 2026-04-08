import type { NextResponse } from 'next/server';

/**
 * Pattern that matches the standalone chat route used for embedding.
 *
 * @private function of applyEmbeddingHeader
 */
const EMBED_CHAT_PATHNAME_PATTERN = /^\/agents\/[^/]+\/chat\/?$/;

/**
 * Applies framing headers for the headless chat embedding route based on whether embedding is allowed.
 *
 * @param response - Response object that will be sent to the browser.
 * @param url - Parsed request URL used to check whether the embedding route was requested.
 * @param isAllowed - When true, framing is permitted; otherwise it is denied.
 *
 * @private function of middleware
 */
export function applyEmbeddingHeader(response: NextResponse, url: URL, isAllowed: boolean): void {
    if (!isEmbedChatRequest(url)) {
        return;
    }

    if (isAllowed) {
        response.headers.set('Content-Security-Policy', 'frame-ancestors https: http:');
        response.headers.delete('X-Frame-Options');
        return;
    }

    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    response.headers.set('X-Frame-Options', 'DENY');
}

/**
 * Checks whether request targets the headless chat route used for iframe embedding.
 *
 * @param url - Parsed request URL.
 * @returns `true` when framing headers should be applied.
 *
 * @private function of applyEmbeddingHeader
 */
function isEmbedChatRequest(url: URL): boolean {
    return EMBED_CHAT_PATHNAME_PATTERN.test(url.pathname) && url.searchParams.has('headless');
}
