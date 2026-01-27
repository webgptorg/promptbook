import { spaceTrim } from 'spacetrim';

/**
 * Constructs a standardized filename for a generated image based on its prompt and parameters.
 *
 * @param params - The parameters for the image generation
 * @returns The constructed filename
 */
export function constructImageFilename(params: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
    style?: string;
}): string {
    const { prompt, model, size, quality, style } = params;

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
        '.png'
    );
}
