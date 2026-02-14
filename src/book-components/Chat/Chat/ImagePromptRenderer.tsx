'use client';

import { useEffect, useMemo, useState } from 'react';
import spaceTrim from 'spacetrim';
import { constructImageFilename } from '../../../utils/normalization/constructImageFilename';
import styles from './Chat.module.css';

type ImagePromptGenerationStatus = 'loading' | 'success' | 'error';

const generatedImageCache = new Map<string, string>();
const pendingImageFetches = new Map<string, Promise<string>>();

async function fetchGeneratedImageUrl(filename: string): Promise<string> {
    const cached = generatedImageCache.get(filename);
    if (cached) {
        return cached;
    }

    if (pendingImageFetches.has(filename)) {
        return pendingImageFetches.get(filename)!;
    }

    const request = (async () => {
        const response = await fetch(`/api/images/${encodeURIComponent(filename)}?raw=true`, {
            headers: {
                'X-Promptbook-Client': 'chat',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Image generation failed (${response.status})`);
        }

        const payload = await response.json();
        if (!payload?.cdnUrl) {
            throw new Error('Image generation API did not return a valid URL');
        }

        generatedImageCache.set(filename, payload.cdnUrl);
        return payload.cdnUrl;
    })();

    pendingImageFetches.set(filename, request);
    request.finally(() => pendingImageFetches.delete(filename));

    return request;
}

/**
 * Props for rendering an interactive image prompt placeholder.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export type ImagePromptRendererProps = {
    /**
     * Alt text provided by the agent for the image.
     */
    alt: string;
    /**
     * Prompt text that will be sent to the image generation API.
     */
    prompt: string;
};

/**
 * Renders a preview area for the `![alt](?image-prompt=...)` notation.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export function ImagePromptRenderer({ alt, prompt }: ImagePromptRendererProps) {
    const trimmedPrompt = useMemo(() => spaceTrim(prompt), [prompt]);
    const filename = useMemo(
        () =>
            constructImageFilename({
                prompt: trimmedPrompt,
            }),
        [trimmedPrompt],
    );

    const [status, setStatus] = useState<ImagePromptGenerationStatus>('loading');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        setStatus('loading');
        setImageUrl(null);
        setError(null);

        void fetchGeneratedImageUrl(filename)
            .then((url) => {
                if (!isMounted) {
                    return;
                }
                setImageUrl(url);
                setStatus('success');
            })
            .catch((fetchError) => {
                if (!isMounted) {
                    return;
                }
                setStatus('error');
                setError(fetchError?.message || 'Failed to generate image');
            });

        return () => {
            isMounted = false;
        };
    }, [filename]);

    const statusLabel =
        status === 'loading'
            ? 'Generating image...'
            : status === 'error'
            ? 'Failed to generate image'
            : 'Image generated';

    return (
        <div className={styles.imagePrompt} aria-live="polite">
            <div className={styles.imagePromptPreview}>
                {status === 'success' && imageUrl ? (
                    <img src={imageUrl} alt={alt} className={styles.imagePromptImage} />
                ) : (
                    <div className={styles.imagePromptPlaceholder}>
                        <div className={styles.imagePromptSpinner} />
                    </div>
                )}
                {status === 'error' && error && (
                    <div className={styles.imagePromptError}>{error}</div>
                )}
            </div>
            <div className={styles.imagePromptMeta}>
                <span className={styles.imagePromptPrompt}>{trimmedPrompt || 'Generated image'}</span>
                <span className={styles.imagePromptStatus}>{statusLabel}</span>
            </div>
        </div>
    );
}
