'use client';

import type { StreamingFeatureBoundary } from '../utils/sanitizeStreamingMessageContent';
import styles from './Chat.module.css';

/**
 * Placeholder types that describe which rich feature is still streaming.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type StreamingFeaturePlaceholderKind = 'map' | 'image' | 'math' | 'feature';

/**
 * Human-friendly labels associated with each streaming rich feature kind.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const STREAMING_FEATURE_PLACEHOLDER_LABELS: Record<StreamingFeaturePlaceholderKind, string> = {
    map: 'Map preview',
    image: 'Image generation',
    math: 'Math formula',
    feature: 'Rich content',
};

/**
 * Resolves which rich feature is still streaming so the UI can render the matching placeholder.
 *
 * @param boundary - Streaming metadata returned by the sanitizer.
 * @param source - Original message content that contains the pending markup.
 * @returns Friendly placeholder kind to render inside the chat bubble.
 * @private internal helper of `<ChatMessageItem/>`
 */
export function resolveStreamingFeaturePlaceholderKind(
    boundary: StreamingFeatureBoundary,
    source: string,
): StreamingFeaturePlaceholderKind {
    if (boundary.kind === 'imagePrompt') {
        return 'image';
    }

    if (boundary.kind === 'math') {
        return 'math';
    }

    if (boundary.kind === 'codeFence') {
        const snippet = source.slice(boundary.index, boundary.index + 20).toLowerCase();
        if (snippet.includes('geojson')) {
            return 'map';
        }
    }

    return 'feature';
}

/**
 * Props for `<StreamingFeaturePlaceholder/>`.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type StreamingFeaturePlaceholderProps = {
    /**
     * Kind of the placeholder to render.
     */
    readonly kind: StreamingFeaturePlaceholderKind;
};

/**
 * Renders the placeholder UI for streaming rich features.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function StreamingFeaturePlaceholder({ kind }: StreamingFeaturePlaceholderProps) {
    return (
        <div className={styles.richFeaturePlaceholder} aria-live="polite">
            <span className={styles.richFeaturePlaceholderSpinner} aria-hidden="true" />
            <div className={styles.richFeaturePlaceholderCopy}>
                <span className={styles.richFeaturePlaceholderTitle}>{STREAMING_FEATURE_PLACEHOLDER_LABELS[kind]}</span>
                <span className={styles.richFeaturePlaceholderStatus}>Waiting for the agent…</span>
            </div>
        </div>
    );
}
