import type { CDPSession, Page } from 'playwright';
import type { PagePreviewViewport } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewViewport';

/**
 * Options used when starting one CDP screencast for a live page preview.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type StartPagePreviewScreencastOptions = {
    /**
     * Playwright page bound to the preview stream.
     */
    readonly page: Page;

    /**
     * Initial viewport of the streamed page.
     */
    readonly viewport: PagePreviewViewport;

    /**
     * JPEG quality (`0`-`100`) of the screencast frames.
     */
    readonly jpegQuality: number;

    /**
     * Receives each decoded JPEG frame as soon as the browser paints.
     */
    readonly onFrame: (frame: Buffer) => void;
};

/**
 * Running CDP screencast of one live page preview.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type PagePreviewScreencast = {
    /**
     * CDP session backing the screencast, reusable for navigation-history lookups.
     */
    readonly cdpSession: CDPSession;

    /**
     * Restarts the screencast with new frame bounds after a viewport change.
     */
    readonly applyViewport: (viewport: PagePreviewViewport) => Promise<void>;

    /**
     * Stops the screencast and detaches the CDP session.
     */
    readonly stop: () => Promise<void>;
};

/**
 * Starts a Chrome DevTools Protocol screencast that pushes a frame whenever the page repaints.
 *
 * Compared to periodic `page.screenshot` polling this delivers smooth video playback and
 * scrolling while costing nothing when the page is static. Falls back gracefully by returning
 * `null` when the browser does not support CDP (the caller then keeps screenshot polling).
 *
 * @param options - Screencast options.
 * @returns Running screencast, or `null` when CDP screencasting is unavailable.
 *
 * @private internal utility of Agents Server page-preview streaming
 */
export async function startPagePreviewScreencast(
    options: StartPagePreviewScreencastOptions,
): Promise<PagePreviewScreencast | null> {
    try {
        const cdpSession = await options.page.context().newCDPSession(options.page);

        cdpSession.on('Page.screencastFrame', (frameEvent) => {
            options.onFrame(Buffer.from(frameEvent.data, 'base64'));
            cdpSession
                .send('Page.screencastFrameAck', { sessionId: frameEvent.sessionId })
                .catch(() => undefined);
        });

        const startScreencast = async (viewport: PagePreviewViewport): Promise<void> => {
            await cdpSession.send('Page.startScreencast', {
                format: 'jpeg',
                quality: options.jpegQuality,
                maxWidth: viewport.width,
                maxHeight: viewport.height,
                everyNthFrame: 1,
            });
        };

        await startScreencast(options.viewport);

        return {
            cdpSession,
            async applyViewport(viewport: PagePreviewViewport): Promise<void> {
                await cdpSession.send('Page.stopScreencast').catch(() => undefined);
                await startScreencast(viewport);
            },
            async stop(): Promise<void> {
                await cdpSession.send('Page.stopScreencast').catch(() => undefined);
                await cdpSession.detach().catch(() => undefined);
            },
        };
    } catch (error) {
        console.warn('[page-preview] CDP screencast unavailable, falling back to screenshot polling', error);
        return null;
    }
}
