/**
 * Viewport of one live page-preview browser session, in CSS pixels.
 *
 * @private type shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export type PagePreviewViewport = {
    readonly width: number;
    readonly height: number;
};

/**
 * Smallest viewport accepted for one live page-preview browser session.
 *
 * @private constant shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export const PAGE_PREVIEW_MIN_VIEWPORT: PagePreviewViewport = {
    width: 320,
    height: 240,
};

/**
 * Largest viewport accepted for one live page-preview browser session.
 *
 * @private constant shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export const PAGE_PREVIEW_MAX_VIEWPORT: PagePreviewViewport = {
    width: 1920,
    height: 1200,
};

/**
 * Viewport used when the client did not measure its preview area yet.
 *
 * @private constant shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export const PAGE_PREVIEW_DEFAULT_VIEWPORT: PagePreviewViewport = {
    width: 1280,
    height: 800,
};

/**
 * Clamps one requested page-preview viewport into the supported bounds.
 *
 * @param width - Requested viewport width.
 * @param height - Requested viewport height.
 * @returns Rounded viewport within the supported bounds, or `null` when the values are not finite numbers.
 *
 * @private utility shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export function clampPagePreviewViewport(width: unknown, height: unknown): PagePreviewViewport | null {
    if (
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
    ) {
        return null;
    }

    return {
        width: Math.round(Math.max(PAGE_PREVIEW_MIN_VIEWPORT.width, Math.min(PAGE_PREVIEW_MAX_VIEWPORT.width, width))),
        height: Math.round(
            Math.max(PAGE_PREVIEW_MIN_VIEWPORT.height, Math.min(PAGE_PREVIEW_MAX_VIEWPORT.height, height)),
        ),
    };
}
