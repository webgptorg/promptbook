import type { Page } from 'playwright';
import { spaceTrim } from 'spacetrim';
import {
    LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT,
    LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH,
} from '../../../../../src/book-components/Chat/utils/livePagePreviewConstants';
import { KnowledgeScrapeError } from '../../../../../src/errors/KnowledgeScrapeError';
import { $provideBrowserForServer } from '../../tools/$provideBrowserForServer';

/**
 * Pattern for live-preview session identifiers created by the browser client.
 */
const LIVE_PAGE_PREVIEW_SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Navigation timeout for opening a live knowledge preview page.
 */
const LIVE_PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Playwright action timeout for live-preview interactions.
 */
const LIVE_PAGE_PREVIEW_ACTION_TIMEOUT_MS = 5_000;

/**
 * Idle session lifetime before a stale live-preview page is closed.
 */
const LIVE_PAGE_PREVIEW_SESSION_IDLE_TIMEOUT_MS = 60_000;

/**
 * Multipart response boundary used by the live-preview image stream.
 */
const LIVE_PAGE_PREVIEW_STREAM_BOUNDARY = 'page-preview-frame';

/**
 * Delay between live-preview browser frames.
 */
const LIVE_PAGE_PREVIEW_FRAME_INTERVAL_MS = 500;

/**
 * JPEG quality for live-preview browser frames.
 */
const LIVE_PAGE_PREVIEW_JPEG_QUALITY = 65;

/**
 * Browser page stored for a live knowledge preview session.
 */
type LivePagePreviewSession = {
    readonly page: Page;
    readonly url: string;
    lastAccessedAt: number;
};

/**
 * Pointer interaction sent from the live preview image to the browser page.
 */
type LivePagePreviewClickInteraction = {
    readonly type: 'click';
    readonly x: number;
    readonly y: number;
};

/**
 * Wheel interaction sent from the live preview image to the browser page.
 */
type LivePagePreviewWheelInteraction = {
    readonly type: 'wheel';
    readonly deltaX: number;
    readonly deltaY: number;
};

/**
 * Keyboard interaction sent from the live preview image to the browser page.
 */
type LivePagePreviewKeyDownInteraction = {
    readonly type: 'keyDown';
    readonly key: string;
};

/**
 * Supported interaction payload for a live knowledge preview session.
 */
export type LivePagePreviewInteraction =
    | LivePagePreviewClickInteraction
    | LivePagePreviewWheelInteraction
    | LivePagePreviewKeyDownInteraction;

/**
 * Active browser pages for live knowledge previews.
 */
const LIVE_PAGE_PREVIEW_SESSIONS = new Map<string, LivePagePreviewSession>();

/**
 * Content type for the live-preview multipart image stream.
 */
export const LIVE_PAGE_PREVIEW_STREAM_CONTENT_TYPE = `multipart/x-mixed-replace; boundary=${LIVE_PAGE_PREVIEW_STREAM_BOUNDARY}`;

/**
 * Checks whether a live-preview session identifier is safe to use as a map key.
 *
 * @param sessionId - Candidate session identifier.
 * @returns True when the value is a valid live-preview session id.
 */
export function isLivePagePreviewSessionId(sessionId: string): boolean {
    return LIVE_PAGE_PREVIEW_SESSION_ID_PATTERN.test(sessionId);
}

/**
 * Opens or reuses the browser page for one live knowledge preview.
 *
 * @param options - Session, target URL, and request cancellation signal.
 * @returns Playwright page backing the live preview.
 */
export async function getOrCreateLivePagePreviewSession(options: {
    readonly sessionId: string;
    readonly url: string;
    readonly signal: AbortSignal;
}): Promise<Page> {
    pruneExpiredLivePagePreviewSessions();

    const existingSession = LIVE_PAGE_PREVIEW_SESSIONS.get(options.sessionId);
    if (existingSession && existingSession.url === options.url && !existingSession.page.isClosed()) {
        existingSession.lastAccessedAt = Date.now();
        return existingSession.page;
    }

    if (existingSession) {
        await closeLivePagePreviewSession(options.sessionId);
    }

    const browserContext = await $provideBrowserForServer({
        signal: options.signal,
        sessionId: options.sessionId,
    });
    const page = await browserContext.newPage();

    try {
        page.setDefaultNavigationTimeout(LIVE_PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS);
        page.setDefaultTimeout(LIVE_PAGE_PREVIEW_ACTION_TIMEOUT_MS);
        await page.setViewportSize({
            width: LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH,
            height: LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT,
        });
        await page.goto(options.url, {
            waitUntil: 'domcontentloaded',
            timeout: LIVE_PAGE_PREVIEW_NAVIGATION_TIMEOUT_MS,
        });
    } catch {
        await closeLivePagePreviewPage(page);
        throw new KnowledgeScrapeError(
            spaceTrim(`
                Failed to open live knowledge preview for \`${options.url}\`.

                The browser session could not navigate to the requested source.
            `),
        );
    }

    LIVE_PAGE_PREVIEW_SESSIONS.set(options.sessionId, {
        page,
        url: options.url,
        lastAccessedAt: Date.now(),
    });

    return page;
}

/**
 * Closes one live knowledge preview session if it exists.
 *
 * @param sessionId - Live-preview session identifier.
 */
export async function closeLivePagePreviewSession(sessionId: string): Promise<void> {
    const existingSession = LIVE_PAGE_PREVIEW_SESSIONS.get(sessionId);
    if (!existingSession) {
        return;
    }

    LIVE_PAGE_PREVIEW_SESSIONS.delete(sessionId);
    await closeLivePagePreviewPage(existingSession.page);
}

/**
 * Creates an MJPEG stream from an active live-preview browser page.
 *
 * @param options - Session identifier, browser page, and request cancellation signal.
 * @returns Readable stream that emits JPEG browser frames until the client disconnects.
 */
export function createLivePagePreviewStream(options: {
    readonly sessionId: string;
    readonly page: Page;
    readonly signal: AbortSignal;
}): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let isStreamClosed = false;
    let isSessionClosed = false;

    const closeSessionOnce = async (): Promise<void> => {
        if (isSessionClosed) {
            return;
        }

        isSessionClosed = true;
        await closeLivePagePreviewSession(options.sessionId);
    };

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            const handleAbort = (): void => {
                isStreamClosed = true;
                void closeSessionOnce();
            };

            options.signal.addEventListener('abort', handleAbort, { once: true });

            try {
                while (!isStreamClosed && !options.signal.aborted && !options.page.isClosed()) {
                    const buffer = await options.page.screenshot({
                        type: 'jpeg',
                        quality: LIVE_PAGE_PREVIEW_JPEG_QUALITY,
                    });

                    if (isStreamClosed || options.signal.aborted || options.page.isClosed()) {
                        break;
                    }

                    const header = [
                        '',
                        `--${LIVE_PAGE_PREVIEW_STREAM_BOUNDARY}`,
                        'Content-Type: image/jpeg',
                        `Content-Length: ${buffer.length}`,
                        '',
                        '',
                    ].join('\r\n');

                    controller.enqueue(encoder.encode(header));
                    controller.enqueue(buffer);

                    await waitForLivePagePreviewFrame(options.signal);
                }
            } catch (error) {
                if (!isStreamClosed && !options.signal.aborted) {
                    console.error('Error streaming live page preview:', error);
                }
            } finally {
                isStreamClosed = true;
                options.signal.removeEventListener('abort', handleAbort);
                await closeSessionOnce();

                try {
                    controller.close();
                } catch {
                    // The client can disconnect before the server closes the stream.
                }
            }
        },
        async cancel() {
            isStreamClosed = true;
            await closeSessionOnce();
        },
    });
}

/**
 * Applies one browser interaction to an active live preview session.
 *
 * @param options - Session identifier and normalized interaction.
 * @returns True when the interaction was applied to an active session.
 */
export async function applyLivePagePreviewInteraction(options: {
    readonly sessionId: string;
    readonly interaction: LivePagePreviewInteraction;
}): Promise<boolean> {
    const session = LIVE_PAGE_PREVIEW_SESSIONS.get(options.sessionId);
    if (!session || session.page.isClosed()) {
        LIVE_PAGE_PREVIEW_SESSIONS.delete(options.sessionId);
        return false;
    }

    session.lastAccessedAt = Date.now();

    switch (options.interaction.type) {
        case 'click':
            await session.page.mouse.click(
                clampLivePagePreviewCoordinate(options.interaction.x, LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH),
                clampLivePagePreviewCoordinate(options.interaction.y, LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT),
            );
            return true;

        case 'wheel':
            await session.page.mouse.wheel(options.interaction.deltaX, options.interaction.deltaY);
            return true;

        case 'keyDown':
            await session.page.keyboard.press(options.interaction.key);
            return true;
    }
}

/**
 * Removes stale live-preview sessions left behind by disconnected clients.
 */
function pruneExpiredLivePagePreviewSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of LIVE_PAGE_PREVIEW_SESSIONS) {
        const isExpired = now - session.lastAccessedAt > LIVE_PAGE_PREVIEW_SESSION_IDLE_TIMEOUT_MS;
        if (isExpired || session.page.isClosed()) {
            LIVE_PAGE_PREVIEW_SESSIONS.delete(sessionId);
            void closeLivePagePreviewPage(session.page);
        }
    }
}

/**
 * Waits between streamed browser frames, resolving early when the request is aborted.
 *
 * @param signal - Request cancellation signal.
 */
async function waitForLivePagePreviewFrame(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
        return;
    }

    await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
            signal.removeEventListener('abort', handleAbort);
            resolve();
        }, LIVE_PAGE_PREVIEW_FRAME_INTERVAL_MS);

        function handleAbort(): void {
            clearTimeout(timeout);
            resolve();
        }

        signal.addEventListener('abort', handleAbort, { once: true });
    });
}

/**
 * Closes a Playwright page while ignoring cleanup errors.
 *
 * @param page - Browser page to close.
 */
async function closeLivePagePreviewPage(page: Page): Promise<void> {
    if (page.isClosed()) {
        return;
    }

    await page.close().catch(() => undefined);
}

/**
 * Clamps a pointer coordinate to the configured live-preview viewport.
 *
 * @param value - Raw coordinate from the web UI.
 * @param maximum - Maximum coordinate value for one axis.
 * @returns Coordinate safe to pass into Playwright.
 */
function clampLivePagePreviewCoordinate(value: number, maximum: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(Math.max(value, 0), maximum);
}
