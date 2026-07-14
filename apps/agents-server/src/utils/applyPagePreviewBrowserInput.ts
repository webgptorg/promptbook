import type { PagePreviewInputEvent } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewInputEvent';
import type { PagePreviewViewport } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewViewport';
import { assertSafeUrl } from './assertSafeUrl';
import type { PagePreviewBrowserSession } from './pagePreviewBrowserSessions';
import { updatePagePreviewBrowserSessionViewport } from './pagePreviewBrowserSessions';
import { appendTaskTerminalLogLine } from './taskTerminal/taskTerminalLog';

/**
 * Navigation timeout for toolbar-initiated page-preview navigations.
 *
 * @private internal constant of Agents Server page-preview input handling
 */
const PAGE_PREVIEW_INPUT_NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Applies one normalized remote-control event to the live page of a browser preview session.
 *
 * Pointer ratios are converted into viewport coordinates, keyboard events are replayed through
 * the Playwright keyboard (falling back to text insertion for keys outside the US layout, for
 * example accented characters), and navigations run in the background so the input queue is not
 * blocked while the page loads.
 *
 * @param session - Active browser preview session with an attached page and viewport.
 * @param inputEvent - Normalized input event.
 *
 * @private internal utility of Agents Server page-preview input handling
 */
export async function applyPagePreviewBrowserInput(
    session: PagePreviewBrowserSession,
    inputEvent: PagePreviewInputEvent,
): Promise<void> {
    const page = session.page;
    const viewport = session.viewport;
    if (!page || !viewport) {
        return;
    }

    switch (inputEvent.type) {
        case 'move': {
            const { x, y } = resolvePointerPosition(inputEvent, viewport);
            await page.mouse.move(x, y);
            return;
        }

        case 'down': {
            const { x, y } = resolvePointerPosition(inputEvent, viewport);
            await page.mouse.move(x, y);
            await page.mouse.down({ button: inputEvent.button, clickCount: inputEvent.clickCount });
            return;
        }

        case 'up': {
            const { x, y } = resolvePointerPosition(inputEvent, viewport);
            await page.mouse.move(x, y);
            await page.mouse.up({ button: inputEvent.button, clickCount: inputEvent.clickCount });
            return;
        }

        case 'click': {
            const { x, y } = resolvePointerPosition(inputEvent, viewport);
            await page.mouse.click(x, y);
            return;
        }

        case 'wheel': {
            const { x, y } = resolvePointerPosition(inputEvent, viewport);
            await page.mouse.move(x, y);
            await page.mouse.wheel(inputEvent.deltaX, inputEvent.deltaY);
            return;
        }

        case 'keydown': {
            try {
                await page.keyboard.down(inputEvent.key);
            } catch {
                if (Array.from(inputEvent.key).length === 1) {
                    await page.keyboard.insertText(inputEvent.key).catch(() => undefined);
                }
            }
            return;
        }

        case 'keyup': {
            await page.keyboard.up(inputEvent.key).catch(() => undefined);
            return;
        }

        case 'resize': {
            const requestedViewport: PagePreviewViewport = { width: inputEvent.width, height: inputEvent.height };
            if (session.applyViewport) {
                await session.applyViewport(requestedViewport);
            } else {
                await page.setViewportSize(requestedViewport);
                updatePagePreviewBrowserSessionViewport(session.id, requestedViewport);
            }
            return;
        }

        case 'navigate': {
            const navigationPromise =
                inputEvent.action === 'back'
                    ? page.goBack({ timeout: PAGE_PREVIEW_INPUT_NAVIGATION_TIMEOUT_MS })
                    : inputEvent.action === 'forward'
                    ? page.goForward({ timeout: PAGE_PREVIEW_INPUT_NAVIGATION_TIMEOUT_MS })
                    : page.reload({ timeout: PAGE_PREVIEW_INPUT_NAVIGATION_TIMEOUT_MS });

            watchBackgroundNavigation(session, inputEvent.action, navigationPromise);
            return;
        }

        case 'goto': {
            assertSafeUrl(inputEvent.url);
            watchBackgroundNavigation(
                session,
                `goto ${inputEvent.url}`,
                page.goto(inputEvent.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: PAGE_PREVIEW_INPUT_NAVIGATION_TIMEOUT_MS,
                }),
            );
            return;
        }

        default: {
            const unreachableEvent: never = inputEvent;
            void unreachableEvent;
        }
    }
}

/**
 * Converts pointer ratios into coordinates inside the streamed viewport.
 *
 * @param pointer - Event carrying pointer ratios.
 * @param viewport - Viewport of the streamed page.
 * @returns Pointer position in viewport pixels.
 */
function resolvePointerPosition(
    pointer: { readonly xRatio: number; readonly yRatio: number },
    viewport: PagePreviewViewport,
): { readonly x: number; readonly y: number } {
    return {
        x: Math.min(viewport.width - 1, pointer.xRatio * viewport.width),
        y: Math.min(viewport.height - 1, pointer.yRatio * viewport.height),
    };
}

/**
 * Lets one toolbar navigation finish in the background, logging failures into the session log.
 *
 * The input response must not wait for the page load — progress is visible in the live stream.
 *
 * @param session - Session owning the navigation.
 * @param actionDescription - Human-readable description used in the failure log line.
 * @param navigationPromise - Running navigation.
 */
function watchBackgroundNavigation(
    session: PagePreviewBrowserSession,
    actionDescription: string,
    navigationPromise: Promise<unknown>,
): void {
    void navigationPromise.catch((error) => {
        appendTaskTerminalLogLine(
            session.id,
            `Browser preview navigation (${actionDescription}) failed: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    });
}
