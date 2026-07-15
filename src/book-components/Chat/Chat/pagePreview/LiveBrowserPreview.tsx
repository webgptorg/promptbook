'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from '../Chat.module.css';
import { createPagePreviewSessionId } from './createPagePreviewSessionId';
import type { PagePreviewNavigationAction, PagePreviewPointerButton } from './PagePreviewInputEvent';
import { PagePreviewInputQueue } from './PagePreviewInputQueue';
import type { PagePreviewSessionState } from './PagePreviewSessionState';
import {
    clampPagePreviewViewport,
    PAGE_PREVIEW_DEFAULT_VIEWPORT,
    type PagePreviewViewport,
} from './PagePreviewViewport';
import { LiveBrowserPreviewToolbar } from './LiveBrowserPreviewToolbar';

/**
 * Props of the live browser preview.
 *
 * @private component of `<ChatCitationModal/>`
 */
export type LiveBrowserPreviewProps = {
    /**
     * URL opened in the remote headless browser.
     */
    readonly src: string;

    /**
     * Human-readable title of the previewed source.
     */
    readonly title: string;

    /**
     * Optional agent identifier (name or permanent id).
     *
     * When set, the live session runs inside the agent's persistent server-side browser profile,
     * so actions like logging into a website are saved for the agent's future browsing.
     */
    readonly agentIdentifier?: string;

    /**
     * Optional close handler for modal-hosted previews.
     */
    readonly onClose?: () => void;
};

/**
 * Milliseconds between two toolbar state polls.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_STATE_POLL_INTERVAL_MS = 2500;

/**
 * Debounce applied before a preview-area resize is forwarded to the remote viewport.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_RESIZE_DEBOUNCE_MS = 400;

/**
 * Smallest local zoom level of the preview.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_MIN_ZOOM = 0.5;

/**
 * Largest local zoom level of the preview.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_MAX_ZOOM = 3;

/**
 * Zoom step applied by the toolbar zoom buttons.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_ZOOM_STEP = 0.25;

/**
 * Zoom factor applied per Ctrl+wheel (or pinch) notch.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_WHEEL_ZOOM_FACTOR = 1.1;

/**
 * Milliseconds within which repeated presses at the same spot count as multi-clicks.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_MULTI_CLICK_INTERVAL_MS = 500;

/**
 * Pixel tolerance within which repeated presses count as multi-clicks.
 *
 * @private constant of `<LiveBrowserPreview/>`
 */
const PAGE_PREVIEW_MULTI_CLICK_DISTANCE_PX = 5;

/**
 * Remote-desktop-like live preview of one server-side headless browser session.
 *
 * Renders the MJPEG stream of the Agents Server page-preview route and forwards natural
 * browser interactions to it — hovering, clicking, double-clicking, dragging and text
 * selection (raw pointer presses with click counts), scrolling, typing and keyboard
 * shortcuts. A browser-like toolbar adds history navigation, an editable address bar,
 * local zoom (Ctrl+wheel or buttons), and a full screen mode. The remote viewport follows
 * the size of the preview area, so the page is always rendered at the size the user sees.
 *
 * @private component of `<ChatCitationModal/>`
 */
export function LiveBrowserPreview({ src, title, agentIdentifier, onClose }: LiveBrowserPreviewProps) {
    const [reconnectCounter, setReconnectCounter] = useState(0);
    // A fresh session id is needed per previewed URL and per reconnect attempt
    const sessionId = useMemo(() => createPagePreviewSessionId(), [src, reconnectCounter]);

    const [streamViewport, setStreamViewport] = useState<PagePreviewViewport | null>(null);
    const [sessionState, setSessionState] = useState<PagePreviewSessionState | null>(null);
    const [urlDraft, setUrlDraft] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isStreamLoaded, setIsStreamLoaded] = useState(false);
    const [isDisconnected, setIsDisconnected] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const streamAreaRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const lastSentViewportRef = useRef<PagePreviewViewport | null>(null);
    const hasSessionStateRef = useRef(false);
    const clickTrackerRef = useRef({ atMs: 0, clientX: 0, clientY: 0, count: 1 });

    // Note: The queue is intentionally not disposed on unmount — React StrictMode re-runs effects
    // with the same memoized instance, and an unreferenced queue simply drains and gets collected
    const inputQueue = useMemo(
        () =>
            new PagePreviewInputQueue({
                sessionId,
                onSessionState: (state) => {
                    hasSessionStateRef.current = true;
                    setSessionState(state);
                },
            }),
        [sessionId],
    );

    // [1] Measure the preview area before opening the stream so the remote viewport matches it
    useLayoutEffect(() => {
        hasSessionStateRef.current = false;
        const streamArea = streamAreaRef.current;
        const measuredViewport =
            streamArea && streamArea.clientWidth > 0 && streamArea.clientHeight > 0
                ? clampPagePreviewViewport(streamArea.clientWidth, streamArea.clientHeight)
                : null;
        const initialViewport = measuredViewport ?? PAGE_PREVIEW_DEFAULT_VIEWPORT;

        lastSentViewportRef.current = initialViewport;
        setStreamViewport(initialViewport);
        setIsStreamLoaded(false);
    }, [sessionId]);

    // [2] Follow preview-area resizes (modal resize, window resize, full screen) with the remote viewport
    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const streamArea = streamAreaRef.current;
        if (!streamArea) {
            return undefined;
        }

        let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
        const resizeObserver = new ResizeObserver(() => {
            if (debounceTimeout !== null) {
                clearTimeout(debounceTimeout);
            }

            debounceTimeout = setTimeout(() => {
                debounceTimeout = null;
                if (streamArea.clientWidth <= 0 || streamArea.clientHeight <= 0) {
                    return;
                }

                const viewport = clampPagePreviewViewport(streamArea.clientWidth, streamArea.clientHeight);
                if (!viewport) {
                    return;
                }

                const lastSentViewport = lastSentViewportRef.current;
                if (
                    lastSentViewport &&
                    lastSentViewport.width === viewport.width &&
                    lastSentViewport.height === viewport.height
                ) {
                    return;
                }

                lastSentViewportRef.current = viewport;
                inputQueue.send({ type: 'resize', ...viewport });
            }, PAGE_PREVIEW_RESIZE_DEBOUNCE_MS);
        });

        resizeObserver.observe(streamArea);
        return () => {
            resizeObserver.disconnect();
            if (debounceTimeout !== null) {
                clearTimeout(debounceTimeout);
            }
        };
    }, [inputQueue]);

    // [3] Poll the session navigation state so the toolbar follows links clicked inside the page
    useEffect(() => {
        if (isDisconnected) {
            return undefined;
        }

        let isCancelled = false;
        const pollSessionState = async () => {
            try {
                const response = await fetch(`/api/page-preview/state?sessionId=${encodeURIComponent(sessionId)}`);
                if (isCancelled) {
                    return;
                }

                if (response.status === 404 && hasSessionStateRef.current) {
                    setIsDisconnected(true);
                    return;
                }

                const data = (await response.json().catch(() => null)) as {
                    state?: PagePreviewSessionState;
                } | null;
                if (isCancelled || !data?.state || typeof data.state.url !== 'string') {
                    return;
                }

                hasSessionStateRef.current = true;
                setSessionState(data.state);
            } catch {
                // Polling is best-effort — the toolbar just keeps its last known state
            }
        };

        const pollInterval = setInterval(pollSessionState, PAGE_PREVIEW_STATE_POLL_INTERVAL_MS);
        return () => {
            isCancelled = true;
            clearInterval(pollInterval);
        };
    }, [sessionId, isDisconnected]);

    // [4] Track full screen changes (including Escape which is handled by the browser itself)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const applyZoomLevel = (requestedZoomLevel: number) => {
        setZoomLevel(
            Math.round(Math.max(PAGE_PREVIEW_MIN_ZOOM, Math.min(PAGE_PREVIEW_MAX_ZOOM, requestedZoomLevel)) * 100) /
                100,
        );
    };

    // [5] Wheel must be attached natively (non-passive) so page scroll and browser zoom are suppressed
    useEffect(() => {
        const streamArea = streamAreaRef.current;
        if (!streamArea) {
            return undefined;
        }

        const handleWheel = (event: globalThis.WheelEvent) => {
            event.preventDefault();

            if (event.ctrlKey || event.metaKey) {
                // Ctrl+wheel (and trackpad pinch) zooms the local preview like remote desktop viewers
                const zoomFactor = event.deltaY < 0 ? PAGE_PREVIEW_WHEEL_ZOOM_FACTOR : 1 / PAGE_PREVIEW_WHEEL_ZOOM_FACTOR;
                setZoomLevel((previousZoomLevel) =>
                    Math.round(
                        Math.max(
                            PAGE_PREVIEW_MIN_ZOOM,
                            Math.min(PAGE_PREVIEW_MAX_ZOOM, previousZoomLevel * zoomFactor),
                        ) * 100,
                    ) / 100,
                );
                return;
            }

            const pointer = resolveStreamPointerRatio(imageRef.current, event.clientX, event.clientY);
            if (!pointer) {
                return;
            }

            inputQueue.send({ type: 'wheel', ...pointer, deltaX: event.deltaX, deltaY: event.deltaY });
        };

        streamArea.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            streamArea.removeEventListener('wheel', handleWheel);
        };
    }, [inputQueue]);

    const resolveClickCount = (event: PointerEvent<HTMLImageElement>): number => {
        const now = Date.now();
        const tracker = clickTrackerRef.current;
        const isSameSpot =
            Math.abs(event.clientX - tracker.clientX) <= PAGE_PREVIEW_MULTI_CLICK_DISTANCE_PX &&
            Math.abs(event.clientY - tracker.clientY) <= PAGE_PREVIEW_MULTI_CLICK_DISTANCE_PX;
        const count =
            now - tracker.atMs <= PAGE_PREVIEW_MULTI_CLICK_INTERVAL_MS && isSameSpot
                ? Math.min(3, tracker.count + 1)
                : 1;

        clickTrackerRef.current = { atMs: now, clientX: event.clientX, clientY: event.clientY, count };
        return count;
    };

    const handlePointerDown = (event: PointerEvent<HTMLImageElement>) => {
        event.preventDefault();
        streamAreaRef.current?.focus({ preventScroll: true });

        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            // Pointer capture is unavailable in some environments (for example test DOMs)
        }

        const pointer = resolveStreamPointerRatio(event.currentTarget, event.clientX, event.clientY);
        if (!pointer) {
            return;
        }

        inputQueue.send({
            type: 'down',
            ...pointer,
            button: resolvePointerButton(event.button),
            clickCount: resolveClickCount(event),
        });
    };

    const handlePointerMove = (event: PointerEvent<HTMLImageElement>) => {
        const pointer = resolveStreamPointerRatio(event.currentTarget, event.clientX, event.clientY);
        if (!pointer) {
            return;
        }

        inputQueue.send({ type: 'move', ...pointer });
    };

    const handlePointerUp = (event: PointerEvent<HTMLImageElement>) => {
        const pointer = resolveStreamPointerRatio(event.currentTarget, event.clientX, event.clientY);
        if (!pointer) {
            return;
        }

        inputQueue.send({
            type: 'up',
            ...pointer,
            button: resolvePointerButton(event.button),
            clickCount: clickTrackerRef.current.count,
        });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        inputQueue.send({ type: 'keydown', key: event.key });
    };

    const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        inputQueue.send({ type: 'keyup', key: event.key });
    };

    const handleNavigate = (action: PagePreviewNavigationAction) => {
        inputQueue.send({ type: 'navigate', action });
    };

    const handleUrlSubmit = (rawUrl: string) => {
        setUrlDraft(null);
        const normalizedUrl = normalizeSubmittedPreviewUrl(rawUrl);
        if (!normalizedUrl) {
            return;
        }

        inputQueue.send({ type: 'goto', url: normalizedUrl });
    };

    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (document.fullscreenElement === container) {
            void document.exitFullscreen?.().catch(() => undefined);
        } else {
            void container.requestFullscreen?.().catch(() => undefined);
        }
    };

    const reconnect = () => {
        setIsDisconnected(false);
        setSessionState(null);
        setUrlDraft(null);
        setStreamViewport(null);
        setReconnectCounter((previousCounter) => previousCounter + 1);
    };

    const streamUrl = streamViewport
        ? `/api/page-preview/stream?url=${encodeURIComponent(src)}&sessionId=${encodeURIComponent(sessionId)}&width=${
              streamViewport.width
          }&height=${streamViewport.height}${agentIdentifier ? `&agent=${encodeURIComponent(agentIdentifier)}` : ''}`
        : null;
    const displayedUrl = urlDraft ?? sessionState?.url ?? src;

    return (
        <div className={styles.liveBrowserPreview} ref={containerRef}>
            <LiveBrowserPreviewToolbar
                displayedUrl={displayedUrl}
                externalUrl={sessionState?.url ?? src}
                canGoBack={sessionState?.canGoBack ?? null}
                canGoForward={sessionState?.canGoForward ?? null}
                zoomLevel={zoomLevel}
                isFullscreen={isFullscreen}
                onNavigate={handleNavigate}
                onUrlDraftChange={setUrlDraft}
                onUrlSubmit={handleUrlSubmit}
                onZoomIn={() => applyZoomLevel(zoomLevel + PAGE_PREVIEW_ZOOM_STEP)}
                onZoomOut={() => applyZoomLevel(zoomLevel - PAGE_PREVIEW_ZOOM_STEP)}
                onZoomReset={() => applyZoomLevel(1)}
                onToggleFullscreen={toggleFullscreen}
                onClose={onClose}
            />
            <div
                className={styles.liveBrowserPreviewStreamArea}
                ref={streamAreaRef}
                tabIndex={0}
                role="application"
                aria-label={`Interactive live browser preview of ${title}`}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
            >
                {!isStreamLoaded && !isDisconnected && (
                    <div className={styles.liveBrowserPreviewConnecting}>Connecting to the live browser…</div>
                )}
                {streamUrl && !isDisconnected && (
                    <img
                        ref={imageRef}
                        src={streamUrl}
                        alt={`Live browser preview of ${title}`}
                        className={styles.liveBrowserPreviewStreamImage}
                        style={{ width: `${zoomLevel * 100}%` }}
                        draggable={false}
                        onLoad={() => setIsStreamLoaded(true)}
                        onError={() => setIsDisconnected(true)}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onContextMenu={(event) => event.preventDefault()}
                    />
                )}
                {isDisconnected && (
                    <div className={styles.liveBrowserPreviewOverlay}>
                        <p>The live browser preview was disconnected.</p>
                        <button type="button" className={styles.liveBrowserPreviewOverlayButton} onClick={reconnect}>
                            Reconnect
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Resolves pointer coordinates as ratios inside the streamed preview image.
 *
 * @param image - Streamed preview image element.
 * @param clientX - Pointer X in client coordinates.
 * @param clientY - Pointer Y in client coordinates.
 * @returns Pointer ratios clamped to `0..1`, or `null` when the image has no measurable size.
 */
function resolveStreamPointerRatio(
    image: HTMLElement | null,
    clientX: number,
    clientY: number,
): { readonly xRatio: number; readonly yRatio: number } | null {
    if (!image) {
        return null;
    }

    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        xRatio: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        yRatio: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
}

/**
 * Maps one `PointerEvent.button` value onto the preview input protocol.
 *
 * @param button - Raw pointer button index.
 * @returns Pointer button name.
 */
function resolvePointerButton(button: number): PagePreviewPointerButton {
    switch (button) {
        case 1:
            return 'middle';
        case 2:
            return 'right';
        default:
            return 'left';
    }
}

/**
 * Normalizes one address-bar submission into an absolute HTTP(S) URL.
 *
 * @param rawUrl - Text typed into the preview address bar.
 * @returns Absolute URL (missing schemes default to `https://`), or `null` when invalid.
 */
function normalizeSubmittedPreviewUrl(rawUrl: string): string | null {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
        return null;
    }

    const candidateUrl = /^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

    try {
        const parsedUrl = new URL(candidateUrl);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.href : null;
    } catch {
        return null;
    }
}
