import type { Page } from 'playwright';
import { $provideBrowserForServer } from '../tools/$provideBrowserForServer';
import type { PagePreviewBrowserViewport } from './pagePreviewBrowserSessions';
import {
    attachPagePreviewBrowserSessionPage,
    finishPagePreviewBrowserSession,
    markPagePreviewBrowserSessionFrame,
} from './pagePreviewBrowserSessions';

/**
 * Boundary used for MJPEG page-preview streams.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_STREAM_BOUNDARY = 'pagepreviewboundary';

/**
 * Width of the live browser preview viewport.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_VIEWPORT_WIDTH = 1280;

/**
 * Height of the live browser preview viewport.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_VIEWPORT_HEIGHT = 800;

/**
 * Milliseconds between streamed browser frames.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_FRAME_INTERVAL_MS = 350;

/**
 * JPEG quality used by the live browser preview stream.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_JPEG_QUALITY = 60;

/**
 * Navigation timeout for one page-preview browser stream.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Response content type for the live page-preview stream.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
export const PAGE_PREVIEW_STREAM_CONTENT_TYPE = `multipart/x-mixed-replace; boundary=${PAGE_PREVIEW_STREAM_BOUNDARY}`;

/**
 * Options used when creating one live browser preview stream.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type CreatePagePreviewBrowserStreamOptions = {
    readonly request: Request;
    readonly sessionId: string;
    readonly url: string;
};

/**
 * Creates a Playwright-backed MJPEG stream for one page-preview browser session.
 *
 * @param options - Stream options.
 * @returns Readable multipart stream.
 */
export function createPagePreviewBrowserStream(options: CreatePagePreviewBrowserStreamOptions): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const viewport: PagePreviewBrowserViewport = {
        width: PAGE_PREVIEW_VIEWPORT_WIDTH,
        height: PAGE_PREVIEW_VIEWPORT_HEIGHT,
    };

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            let isStreamOpen = true;
            let page: Page | null = null;

            const closeStream = async (): Promise<void> => {
                if (!isStreamOpen) {
                    return;
                }

                isStreamOpen = false;
                finishPagePreviewBrowserSession(options.sessionId);
                await page?.close().catch(() => undefined);

                try {
                    controller.close();
                } catch {
                    // The browser may close the stream first when the modal is dismissed.
                }
            };

            options.request.signal.addEventListener(
                'abort',
                () => {
                    void closeStream();
                },
                { once: true },
            );

            try {
                const browserContext = await $provideBrowserForServer({ sessionId: options.sessionId });
                page = await browserContext.newPage();
                attachPagePreviewBrowserSessionPage(options.sessionId, page, viewport);

                await page.setViewportSize(viewport);
                await page.goto(options.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS,
                });

                while (isStreamOpen && !options.request.signal.aborted) {
                    const buffer = await page.screenshot({
                        type: 'jpeg',
                        quality: PAGE_PREVIEW_JPEG_QUALITY,
                    });
                    const header = createPagePreviewFrameHeader(buffer.byteLength);

                    controller.enqueue(encoder.encode(header));
                    controller.enqueue(buffer);
                    markPagePreviewBrowserSessionFrame(options.sessionId);
                    await waitForNextPagePreviewFrame(options.request.signal);
                }
            } catch (error) {
                if (!options.request.signal.aborted) {
                    console.error('[page-preview] live browser stream failed', error);
                    controller.error(error);
                }
            } finally {
                await closeStream();
            }
        },
    });
}

/**
 * Creates one multipart frame header.
 *
 * @param byteLength - JPEG payload length.
 * @returns Multipart frame header.
 */
function createPagePreviewFrameHeader(byteLength: number): string {
    return `\r\n--${PAGE_PREVIEW_STREAM_BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${byteLength}\r\n\r\n`;
}

/**
 * Waits before sending the next stream frame, resolving early on abort.
 *
 * @param signal - Request abort signal.
 */
function waitForNextPagePreviewFrame(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, PAGE_PREVIEW_FRAME_INTERVAL_MS);

        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(timeout);
                resolve();
            },
            { once: true },
        );
    });
}
