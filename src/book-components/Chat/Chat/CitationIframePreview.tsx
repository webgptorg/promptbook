'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import { LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT, LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH } from '../utils/livePagePreviewConstants';
import styles from './Chat.module.css';

/**
 * Props for the citation iframe preview component.
 *
 * @private component of `<ChatCitationModal/>`
 */
export type CitationIframePreviewProps = {
    src: string;
    title: string;
};

/**
 * Internal status of the iframe embed check.
 *
 * @private type of `<CitationIframePreview/>`
 */
type EmbedStatus = 'loading' | 'embed' | 'browser';

/**
 * Browser-preview interaction sent to the Agents Server preview route.
 *
 * @private type of `<CitationIframePreview/>`
 */
type LivePagePreviewInteraction =
    | {
          readonly type: 'click';
          readonly x: number;
          readonly y: number;
      }
    | {
          readonly type: 'wheel';
          readonly deltaX: number;
          readonly deltaY: number;
      }
    | {
          readonly type: 'keyDown';
          readonly key: string;
      };

/**
 * Pointer position translated into the live-preview browser viewport.
 *
 * @private type of `<CitationIframePreview/>`
 */
type LivePagePreviewPointerPosition = {
    readonly x: number;
    readonly y: number;
};

/**
 * Keyboard keys that should not be forwarded as standalone browser actions.
 */
const LIVE_PAGE_PREVIEW_IGNORED_KEYS = new Set(['Alt', 'CapsLock', 'Control', 'Meta', 'Shift']);

/**
 * Renders a citation URL preview as an iframe when the target page allows embedding,
 * or falls back to a live server-side browser preview with an "Open in new tab" link
 * when it does not (e.g. X-Frame-Options: DENY / SAMEORIGIN).
 *
 * Embedding capability is determined by `GET /api/page-preview/check?url=<url>`.
 * If that endpoint is unavailable the component falls back to the iframe directly.
 *
 * @private component of `<ChatCitationModal/>`
 */
export function CitationIframePreview({ src, title }: CitationIframePreviewProps) {
    const [status, setStatus] = useState<EmbedStatus>('loading');

    useEffect(() => {
        let isCancelled = false;

        fetch(`/api/page-preview/check?url=${encodeURIComponent(src)}`)
            .then((response) => response.json())
            .then((data: { canEmbed: boolean }) => {
                if (!isCancelled) {
                    setStatus(data.canEmbed ? 'embed' : 'browser');
                }
            })
            .catch(() => {
                // API not available — fall back to iframe (e.g. outside agents-server)
                if (!isCancelled) {
                    setStatus('embed');
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [src]);

    if (status === 'loading') {
        return <div className={styles.citationIframeLoading}>Loading preview…</div>;
    }

    if (status === 'browser') {
        return <LiveBrowserPreview src={src} title={title} />;
    }

    return <iframe src={src} className={styles.citationIframe} title={title} />;
}

/**
 * Renders and controls a streamed browser preview for non-embeddable citation URLs.
 *
 * @private component of `<CitationIframePreview/>`
 */
function LiveBrowserPreview({ src, title }: CitationIframePreviewProps) {
    const reactSessionId = useId();
    const sessionId = useMemo(() => createLivePagePreviewSessionId(reactSessionId), [reactSessionId]);
    const streamSrc = useMemo(
        () => `/api/page-preview/live?url=${encodeURIComponent(src)}&sessionId=${encodeURIComponent(sessionId)}`,
        [sessionId, src],
    );

    const handleClick = useCallback(
        (event: MouseEvent<HTMLImageElement>) => {
            event.currentTarget.focus();
            const position = resolveLivePagePreviewPointerPosition(event);
            if (!position) {
                return;
            }

            void postLivePagePreviewInteraction(sessionId, {
                type: 'click',
                x: position.x,
                y: position.y,
            });
        },
        [sessionId],
    );

    const handleWheel = useCallback(
        (event: WheelEvent<HTMLImageElement>) => {
            event.preventDefault();
            void postLivePagePreviewInteraction(sessionId, {
                type: 'wheel',
                deltaX: event.deltaX,
                deltaY: event.deltaY,
            });
        },
        [sessionId],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLImageElement>) => {
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }

            const key = normalizeLivePagePreviewKey(event.key);
            if (!key) {
                return;
            }

            event.preventDefault();
            void postLivePagePreviewInteraction(sessionId, {
                type: 'keyDown',
                key,
            });
        },
        [sessionId],
    );

    return (
        <div className={styles.citationBrowserPreviewFallback}>
            <img
                src={streamSrc}
                alt={`Live browser preview of ${title}`}
                className={styles.citationBrowserPreviewImage}
                onClick={handleClick}
                onWheel={handleWheel}
                onKeyDown={handleKeyDown}
                tabIndex={0}
            />
            <a href={src} target="_blank" rel="noopener noreferrer" className={styles.citationBrowserPreviewLink}>
                Open in new tab ↗
            </a>
        </div>
    );
}

/**
 * Creates one browser-preview session id from React's hydration-stable id.
 *
 * @param reactSessionId - React-generated id for the component instance.
 * @returns Session id shared by the stream and interaction endpoints.
 */
function createLivePagePreviewSessionId(reactSessionId: string): string {
    return `preview-${reactSessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Converts one pointer event over the stream image to browser viewport coordinates.
 *
 * @param event - Pointer event from the stream image.
 * @returns Browser viewport position or null when the image has no layout box.
 */
function resolveLivePagePreviewPointerPosition(
    event: MouseEvent<HTMLImageElement>,
): LivePagePreviewPointerPosition | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        x: ((event.clientX - rect.left) / rect.width) * LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT,
    };
}

/**
 * Normalizes one browser keyboard key before forwarding it to Playwright.
 *
 * @param key - Browser KeyboardEvent key.
 * @returns Playwright-compatible key name or null when the key should be ignored.
 */
function normalizeLivePagePreviewKey(key: string): string | null {
    if (!key || LIVE_PAGE_PREVIEW_IGNORED_KEYS.has(key)) {
        return null;
    }

    if (key === ' ') {
        return 'Space';
    }

    return key;
}

/**
 * Sends one live-preview interaction to the Agents Server.
 *
 * @param sessionId - Active live-preview session id.
 * @param interaction - Interaction to apply to the browser page.
 */
async function postLivePagePreviewInteraction(
    sessionId: string,
    interaction: LivePagePreviewInteraction,
): Promise<void> {
    await fetch('/api/page-preview/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            ...interaction,
        }),
    }).catch(() => undefined);
}
