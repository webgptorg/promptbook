'use client';

import { useEffect, useState } from 'react';
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
type EmbedStatus = 'loading' | 'embed' | 'screenshot';

/**
 * Renders a citation URL preview as an iframe when the target page allows embedding,
 * or falls back to a server-side screenshot with an "Open in new tab" link when it
 * does not (e.g. X-Frame-Options: DENY / SAMEORIGIN).
 *
 * Embedding capability is determined by `GET /api/page-preview/check?url=<url>`.
 * If that endpoint is unavailable the component falls back to the iframe directly.
 *
 * @private component of `<ChatCitationModal/>`
 */
export function CitationIframePreview({ src, title }: CitationIframePreviewProps) {
    const [status, setStatus] = useState<EmbedStatus>('loading');

    useEffect(() => {
        let cancelled = false;

        fetch(`/api/page-preview/check?url=${encodeURIComponent(src)}`)
            .then((response) => response.json())
            .then((data: { canEmbed: boolean }) => {
                if (!cancelled) {
                    setStatus(data.canEmbed ? 'embed' : 'screenshot');
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

    if (status === 'screenshot') {
        return (
            <div className={styles.citationScreenshotFallback}>
                <img
                    src={`/api/page-preview/screenshot?url=${encodeURIComponent(src)}`}
                    alt={`Screenshot of ${title}`}
                    className={styles.citationScreenshotImage}
                />
                <a href={src} target="_blank" rel="noopener noreferrer" className={styles.citationScreenshotLink}>
                    Open in new tab ↗
                </a>
            </div>
        );
    }

    return <iframe src={src} className={styles.citationIframe} title={title} />;
}
