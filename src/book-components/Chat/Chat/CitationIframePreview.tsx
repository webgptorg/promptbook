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
};

/**
 * Internal status of the iframe embed check.
 *
 * @private type of `<CitationIframePreview/>`
 */
type EmbedStatus = 'loading' | 'embed' | 'browser-stream';

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
export function CitationIframePreview({ src, title, agentIdentifier }: CitationIframePreviewProps) {
    const [status, setStatus] = useState<EmbedStatus>('loading');

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
        return <LiveBrowserPreview src={src} title={title} agentIdentifier={agentIdentifier} />;
    }

    return <iframe src={src} className={styles.citationIframe} title={title} />;
}
