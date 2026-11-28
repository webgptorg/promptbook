/**
 * Prefix of every live page-preview browser session id.
 *
 * @private constant shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export const PAGE_PREVIEW_SESSION_ID_PREFIX = 'page-preview-';

/**
 * Pattern accepted for client-created page-preview session identifiers.
 *
 * @private constant shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export const PAGE_PREVIEW_SESSION_ID_PATTERN = /^page-preview-[a-z0-9-]{16,80}$/;

/**
 * Fallback suffix length used when `crypto.randomUUID` is unavailable.
 *
 * @private constant of `createPagePreviewSessionId`
 */
const PAGE_PREVIEW_SESSION_ID_FALLBACK_SUFFIX_LENGTH = 24;

/**
 * Creates one client-side page-preview browser session id.
 *
 * @returns Session id accepted by the Agents Server page-preview routes.
 *
 * @private utility of `<LiveBrowserPreview/>`
 */
export function createPagePreviewSessionId(): string {
    const randomId =
        globalThis.crypto && 'randomUUID' in globalThis.crypto
            ? globalThis.crypto.randomUUID()
            : createFallbackPagePreviewSessionIdSuffix();

    return `${PAGE_PREVIEW_SESSION_ID_PREFIX}${randomId}`.toLowerCase();
}

/**
 * Creates a sufficiently long fallback session suffix when Web Crypto UUIDs are unavailable.
 *
 * @returns Lowercase random suffix.
 */
function createFallbackPagePreviewSessionIdSuffix(): string {
    let suffix = '';

    while (suffix.length < PAGE_PREVIEW_SESSION_ID_FALLBACK_SUFFIX_LENGTH) {
        suffix += Math.random().toString(36).slice(2);
    }

    return suffix.slice(0, PAGE_PREVIEW_SESSION_ID_FALLBACK_SUFFIX_LENGTH);
}
