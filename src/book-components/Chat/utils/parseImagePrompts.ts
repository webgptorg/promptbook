import spaceTrim from 'spacetrim';

/**
 * Segment representing parts of a chat message that contain either raw text or an image prompt.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ImagePromptSegment = ImagePromptTextSegment | ImagePromptImageSegment;

/**
 * Raw text segment that can be rendered as markdown.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ImagePromptTextSegment = {
    type: 'text';
    content: string;
};

/**
 * Image prompt segment that needs to fire the image generation pipeline.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ImagePromptImageSegment = {
    type: 'image';
    /**
     * Accessible alt text provided by the agent.
     */
    alt: string;
    /**
     * Prompt text that will be sent to the image generation API.
     */
    prompt: string;
};

const IMAGE_PROMPT_REGEX = /!\[([^\]]*)\]\(\?image-prompt=([^)]+)\)/gi;

function decodePrompt(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Splits a chat message into text and image prompt segments.
 *
 * @param content - Raw markdown string produced by the agent.
 * @returns Ordered list of segments that preserves the original message flow.
 * @private internal helper of `<ChatMessageItem/>`
 */
export function splitMessageContentByImagePrompts(content: string): ReadonlyArray<ImagePromptSegment> {
    if (!content) {
        return [{ type: 'text', content }];
    }

    const segments: ImagePromptSegment[] = [];
    let lastIndex = 0;
    IMAGE_PROMPT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMAGE_PROMPT_REGEX.exec(content)) !== null) {
        const [fullMatch, alt = '', rawPrompt = ''] = match;
        const start = match.index;

        if (start > lastIndex) {
            segments.push({
                type: 'text',
                content: content.slice(lastIndex, start),
            });
        }

        const decodedPrompt = decodePrompt(rawPrompt);
        const prompt = spaceTrim(decodedPrompt) || decodedPrompt || 'Generated image';
        const decodedAlt = decodePrompt(alt);

        segments.push({
            type: 'image',
            alt: spaceTrim(decodedAlt) || 'Generated image',
            prompt,
        });

        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < content.length) {
        segments.push({
            type: 'text',
            content: content.slice(lastIndex),
        });
    }

    if (segments.length === 0) {
        return [{ type: 'text', content }];
    }

    return segments;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
