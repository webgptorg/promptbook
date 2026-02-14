import { spaceTrim } from 'spacetrim';

/**
 * Constructs a standardized filename for a generated image based on its prompt and parameters.
 *
 * @param params - The parameters for the image generation
 * @returns The constructed filename
 *
 * @private internal helper for image generation pipeline
 */
export function constructImageFilename(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    style?: string;
    attachments?: Array<{ url: string }>;
}): string {
    const { prompt, model, size, quality, style, attachments } = params;

    const promptTrimmed = spaceTrim(prompt);

    return (
        promptTrimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') +
        // Note: Default model 'dall-e-3' is omitted for backward compatibility
        (model && model !== 'dall-e-3' ? `-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '') +
        (size === '1024x1024' || size === undefined ? '' : `-${size}`) +
        (quality === 'standard' || quality === undefined ? '' : `-${quality}`) +
        (style === 'vivid' || style === undefined ? '' : `-${style}`) +
        (attachments && attachments.length > 0 ? `-attach-${hashAttachments(attachments)}` : '') +
        '.png'
    );
}

function hashAttachments(attachments: Array<{ url: string }>): string {
    const urls = attachments
        .map((a) => a.url)
        .sort()
        .join('|');
    let hash = 0;
    for (let i = 0; i < urls.length; i++) {
        const char = urls.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return (hash >>> 0).toString(36);
}
