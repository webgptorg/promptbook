'use client';

import { useEffect, useState } from 'react';
import styles from './Chat.module.css';
import { LiveBrowserPreview } from './pagePreview/LiveBrowserPreview';

/**
 * Props for the citation iframe preview component.
 *
 * @private component of `<ChatCitationModal/>`
 */
export type CitationIframePreviewProps = {
    src: string;
    title: string;

    /**
     * Optional agent identifier (name or permanent id) scoping the live browser fallback
     * to the agent's persistent server-side browser profile.
     */
    agentIdentifier?: string;

    /**
     * Optional close handler passed to the live browser toolbar when the preview fills a modal.
     */
    onClose?: () => void;

    /**
     * Reports whether the URL is embedded directly or shown through the live browser fallback.
     */
    onStatusChange?: (status: CitationIframePreviewStatus) => void;

    /**
     * Initial preview status used when the parent already knows the resolved mode.
     */
    initialStatus?: CitationIframePreviewStatus;
};

/**
 * Internal status of the iframe embed check.
 *
 * @private type of `<CitationIframePreview/>`
 */
export type CitationIframePreviewStatus = 'loading' | 'embed' | 'browser-stream';

/**
 * Renders a citation URL preview as an iframe when the target page allows embedding,
 * or falls back to an interactive live server-side browser session (`<LiveBrowserPreview/>`)
 * when it does not (e.g. X-Frame-Options: DENY / SAMEORIGIN).
 *
 * Embedding capability is determined by `GET /api/page-preview/check?url=<url>`.
 * If that endpoint is unavailable the component falls back to the iframe directly.
 *
 * @private component of `<ChatCitationModal/>`
 */
export function CitationIframePreview({
    src,
    title,
    agentIdentifier,
    onClose,
    onStatusChange,
    initialStatus = 'loading',
}: CitationIframePreviewProps) {
    const [status, setStatus] = useState<CitationIframePreviewStatus>(initialStatus);

    useEffect(() => {
        let cancelled = false;
        setStatus(initialStatus);
        onStatusChange?.(initialStatus);

        fetch(`/api/page-preview/check?url=${encodeURIComponent(src)}`)
            .then((response) => response.json())
            .then((data: { canEmbed: boolean }) => {
                if (!cancelled) {
                    const nextStatus = data.canEmbed ? 'embed' : 'browser-stream';
                    setStatus(nextStatus);
                    onStatusChange?.(nextStatus);
                }
            })
            .catch(() => {
                // API not available — fall back to iframe (e.g. outside agents-server)
                if (!cancelled) {
                    setStatus('embed');
                    onStatusChange?.('embed');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [initialStatus, onStatusChange, src]);

    if (status === 'loading') {
        return <div className={styles.citationIframeLoading}>Loading preview…</div>;
    }

    if (status === 'browser-stream') {
        return <LiveBrowserPreview src={src} title={title} agentIdentifier={agentIdentifier} onClose={onClose} />;
    }

    return <iframe src={src} className={styles.citationIframe} title={title} />;
}
