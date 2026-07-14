import type { Page } from 'playwright';
import type { PagePreviewViewport } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewViewport';
import { $provideBrowserForServer } from '../tools/$provideBrowserForServer';
import { createPagePreviewFramePump } from './createPagePreviewFramePump';
import {
    attachPagePreviewBrowserSessionPage,
    finishPagePreviewBrowserSession,
    markPagePreviewBrowserSessionFrame,
    updatePagePreviewBrowserSessionViewport,
} from './pagePreviewBrowserSessions';
import { startPagePreviewScreencast } from './startPagePreviewScreencast';

/**
 * Boundary used for MJPEG page-preview streams.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_STREAM_BOUNDARY = 'pagepreviewboundary';

/**
 * Milliseconds between streamed browser frames when falling back to screenshot polling.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_FRAME_INTERVAL_MS = 350;

/**
 * Minimum milliseconds between two screencast frames (caps the stream at ~15 fps).
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_MINIMUM_FRAME_INTERVAL_MS = 66;

/**
 * Milliseconds of inactivity after which the latest frame is re-sent to keep the stream alive.
 *
 * @private internal constant of Agents Server page-preview streaming
 */
const PAGE_PREVIEW_HEARTBEAT_INTERVAL_MS = 2000;

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

    /**
     * Initial viewport of the streamed page, usually measured from the client preview area.
     */
    readonly viewport: PagePreviewViewport;
};

/**
 * Creates a Playwright-backed MJPEG stream for one page-preview browser session.
 *
 * Frames are sourced from a CDP screencast (pushed on every repaint, smooth for video and
 * scrolling) with a screenshot-polling fallback when CDP is unavailable. The stream keeps
 * running until the client disconnects or the page is closed.
 *
 * @param options - Stream options.
 * @returns Readable multipart stream.
 */
export function createPagePreviewBrowserStream(options: CreatePagePreviewBrowserStreamOptions): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            let isStreamOpen = true;
            let page: Page | null = null;
            let stopFrameSource: (() => void) | null = null;

            const closeStream = async (): Promise<void> => {
                if (!isStreamOpen) {
                    return;
                }

                isStreamOpen = false;
                stopFrameSource?.();
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

            const writeFrame = (frame: Buffer): void => {
                if (!isStreamOpen) {
                    return;
                }

                try {
                    controller.enqueue(encoder.encode(createPagePreviewFrameHeader(frame.byteLength)));
                    controller.enqueue(frame);
                    markPagePreviewBrowserSessionFrame(options.sessionId);
                } catch {
                    // The controller may already be closed when the client disconnects mid-frame.
                }
            };

            try {
                const browserContext = await $provideBrowserForServer({ sessionId: options.sessionId });
                page = await browserContext.newPage();
                await page.setViewportSize(options.viewport);

                const framePump = createPagePreviewFramePump({
                    minimumFrameIntervalMs: PAGE_PREVIEW_MINIMUM_FRAME_INTERVAL_MS,
                    heartbeatIntervalMs: PAGE_PREVIEW_HEARTBEAT_INTERVAL_MS,
                    writeFrame,
                });

                const screencast = await startPagePreviewScreencast({
                    page,
                    viewport: options.viewport,
                    jpegQuality: PAGE_PREVIEW_JPEG_QUALITY,
                    onFrame: framePump.pushFrame,
                });

                stopFrameSource = () => {
                    framePump.stop();
                    void screencast?.stop();
                };

                const streamedPage = page;
                attachPagePreviewBrowserSessionPage(options.sessionId, {
                    page,
                    viewport: options.viewport,
                    cdpSession: screencast?.cdpSession ?? null,
                    applyViewport: async (viewport: PagePreviewViewport) => {
                        await streamedPage.setViewportSize(viewport);
                        await screencast?.applyViewport(viewport);
                        updatePagePreviewBrowserSessionViewport(options.sessionId, viewport);
                    },
                });

                // Navigation happens after the screencast starts so the user watches the page load live
                await page.goto(options.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS,
                });

                if (screencast) {
                    // Prime the stream in case the screencast delivered its first frame before the client attached
                    const initialFrame = await page.screenshot({
                        type: 'jpeg',
                        quality: PAGE_PREVIEW_JPEG_QUALITY,
                    });
                    framePump.pushFrame(initialFrame);

                    await waitForPagePreviewStreamEnd(options.request.signal, page);
                } else {
                    framePump.stop();

                    while (isStreamOpen && !options.request.signal.aborted && !page.isClosed()) {
                        const frame = await page.screenshot({
                            type: 'jpeg',
                            quality: PAGE_PREVIEW_JPEG_QUALITY,
                        });
                        writeFrame(frame);
                        await waitForNextPagePreviewFrame(options.request.signal);
                    }
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
 * Waits until the stream request aborts or the streamed page closes.
 *
 * @param signal - Request abort signal.
 * @param page - Streamed Playwright page.
 */
function waitForPagePreviewStreamEnd(signal: AbortSignal, page: Page): Promise<void> {
    if (signal.aborted || page.isClosed()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
        page.once('close', () => resolve());
    });
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
        const handleAbort = () => {
            clearTimeout(timeout);
            resolve();
        };
        const timeout = setTimeout(() => {
            // The listener must not accumulate on the signal across the many frames of one stream
            signal.removeEventListener('abort', handleAbort);
            resolve();
        }, PAGE_PREVIEW_FRAME_INTERVAL_MS);

        signal.addEventListener('abort', handleAbort, { once: true });
    });
}
