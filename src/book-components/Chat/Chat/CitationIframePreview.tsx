'use client';

import { useEffect, useMemo, useState, type MouseEvent, type WheelEvent } from 'react';
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
type EmbedStatus = 'loading' | 'embed' | 'browser-stream';

/**
 * Prefix shared with the Agents Server page-preview stream route.
 *
 * @private component constant of `<CitationIframePreview/>`
 */
const BROWSER_PREVIEW_SESSION_ID_PREFIX = 'page-preview-';

/**
 * Fallback suffix length used when `crypto.randomUUID` is unavailable.
 *
 * @private component constant of `<CitationIframePreview/>`
 */
const BROWSER_PREVIEW_RANDOM_SUFFIX_LENGTH = 24;

/**
 * Pointer ratio resolved from one browser preview interaction.
 *
 * @private type of `<CitationIframePreview/>`
 */
type BrowserPreviewPointerRatio = {
    readonly xRatio: number;
    readonly yRatio: number;
};

/**
 * Renders a citation URL preview as an iframe when the target page allows embedding,
 * or falls back to a live server-side browser stream with an "Open in new tab" link
 * when it does not (e.g. X-Frame-Options: DENY / SAMEORIGIN).
 *
 * Embedding capability is determined by `GET /api/page-preview/check?url=<url>`.
 * If that endpoint is unavailable the component falls back to the iframe directly.
 *
 * @private component of `<ChatCitationModal/>`
 */
export function CitationIframePreview({ src, title }: CitationIframePreviewProps) {
    const [status, setStatus] = useState<EmbedStatus>('loading');
    const browserPreviewSessionId = useMemo(() => createBrowserPreviewSessionId(), [src]);

    useEffect(() => {
        let cancelled = false;

        fetch(`/api/page-preview/check?url=${encodeURIComponent(src)}`)
            .then((response) => response.json())
            .then((data: { canEmbed: boolean }) => {
                if (!cancelled) {
                    setStatus(data.canEmbed ? 'embed' : 'browser-stream');
                }
            })
            .catch(() => {
                // API not available — fall back to iframe (e.g. outside agents-server)
                if (!cancelled) {
                    setStatus('embed');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [src]);

    if (status === 'loading') {
        return <div className={styles.citationIframeLoading}>Loading preview…</div>;
    }

    if (status === 'browser-stream') {
        return (
            <div className={styles.citationBrowserStreamFallback}>
                <img
                    src={`/api/page-preview/stream?url=${encodeURIComponent(src)}&sessionId=${encodeURIComponent(
                        browserPreviewSessionId,
                    )}`}
                    alt={`Live browser preview of ${title}`}
                    className={styles.citationBrowserStreamImage}
                    draggable={false}
                    onClick={(event) => {
                        const pointerRatio = resolveBrowserPreviewPointerRatio(event);
                        if (!pointerRatio) {
                            return;
                        }

                        sendBrowserPreviewInput({
                            sessionId: browserPreviewSessionId,
                            type: 'click',
                            ...pointerRatio,
                        });
                    }}
                    onWheel={(event) => {
                        event.preventDefault();
                        const pointerRatio = resolveBrowserPreviewPointerRatio(event);
                        if (!pointerRatio) {
                            return;
                        }

                        sendBrowserPreviewInput({
                            sessionId: browserPreviewSessionId,
                            type: 'wheel',
                            deltaX: event.deltaX,
                            deltaY: event.deltaY,
                            ...pointerRatio,
                        });
                    }}
                />
                <a href={src} target="_blank" rel="noopener noreferrer" className={styles.citationBrowserStreamLink}>
                    Open in new tab ↗
                </a>
            </div>
        );
    }

    return <iframe src={src} className={styles.citationIframe} title={title} />;
}

/**
 * Creates one client-side browser preview session id.
 *
 * @returns Session id accepted by Agents Server page-preview stream routes.
 */
function createBrowserPreviewSessionId(): string {
    const randomId =
        globalThis.crypto && 'randomUUID' in globalThis.crypto
            ? globalThis.crypto.randomUUID()
            : createFallbackBrowserPreviewSessionSuffix();

    return `${BROWSER_PREVIEW_SESSION_ID_PREFIX}${randomId}`.toLowerCase();
}

/**
 * Creates a sufficiently long fallback session suffix when Web Crypto UUIDs are unavailable.
 *
 * @returns Lowercase random suffix.
 */
function createFallbackBrowserPreviewSessionSuffix(): string {
    let suffix = '';

    while (suffix.length < BROWSER_PREVIEW_RANDOM_SUFFIX_LENGTH) {
        suffix += Math.random().toString(36).slice(2);
    }

    return suffix.slice(0, BROWSER_PREVIEW_RANDOM_SUFFIX_LENGTH);
}

/**
 * Resolves pointer coordinates as ratios inside the streamed preview image.
 *
 * @param event - Mouse or wheel event fired inside the live preview image.
 * @returns Pointer ratio or `null` when the image has no measurable size.
 */
function resolveBrowserPreviewPointerRatio(
    event: MouseEvent<HTMLImageElement> | WheelEvent<HTMLImageElement>,
): BrowserPreviewPointerRatio | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        xRatio: (event.clientX - rect.left) / rect.width,
        yRatio: (event.clientY - rect.top) / rect.height,
    };
}

/**
 * Sends one browser-preview interaction to the Agents Server stream session.
 *
 * @param payload - Browser-preview input payload.
 */
function sendBrowserPreviewInput(payload: {
    readonly sessionId: string;
    readonly type: 'click' | 'wheel';
    readonly xRatio: number;
    readonly yRatio: number;
    readonly deltaX?: number;
    readonly deltaY?: number;
}): void {
    void fetch('/api/page-preview/input', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => undefined);
}
