
/**
 * Result of extracting parameters from a filename.
 */
export type ExtractedImageParameters = {
    modelName: string;
    size?: string;
    quality?: string;
    style?: string;
    hasAttachments: boolean;
};

/**
 * Extracts technical parameters from a standardized image filename.
 * Reverse operation of `constructImageFilename`.
 *
 * @param filename - The filename to extract parameters from
 * @returns The extracted parameters
 */
export function extractParametersFromFilename(filename: string): ExtractedImageParameters {
    // Remove file extension
    const withoutExtension = filename.replace(/\.[^/.]+$/, '');

    const parts = withoutExtension.split('-');
    
    const result: ExtractedImageParameters = {
        modelName: 'dall-e-3', // Default model
        hasAttachments: false,
    };

    // Check for attachments at the end
    const attachIndex = parts.indexOf('attach');
    if (attachIndex !== -1) {
        result.hasAttachments = true;
        // Remove 'attach' and the hash following it
        parts.splice(attachIndex, 2);
    }

    // Work backwards from the end to find parameters
    // Standard parameters: size (e.g. 1024x1024), quality (standard/hd), style (vivid/natural)
    
    // Check for style
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'vivid' || lastPart === 'natural') {
            result.style = lastPart;
            parts.pop();
        }
    }

    // Check for quality
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'standard' || lastPart === 'hd') {
            result.quality = lastPart;
            parts.pop();
        }
    }

    // Check for size
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (/^\d+x\d+$/.test(lastPart)) {
            result.size = lastPart;
            parts.pop();
        }
    }

    // Remaining parts might contain the model name if it's not dall-e-3
    // But constructImageFilename replaces non-alphanumeric with '-' in model name too
    // This part is tricky because the prompt also has '-'
    // However, constructImageFilename only appends model if it's NOT dall-e-3
    // Let's check common models or look for where the prompt ends.
    // Since we don't know the original prompt here, we'll rely on common patterns or just accept dall-e-3 as default.
    
    return result;
}
