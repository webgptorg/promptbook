/**
 * Options that customize how streaming message content is sanitized.
 */
type SanitizeStreamingMessageContentOptions = {
    /**
     * Whether the chat message has finished streaming.
     */
    isComplete?: boolean;
};

/**
 * Searches for the last unclosed code fence using the provided delimiter.
 */
function findLastUnclosedFence(content: string, delimiter: string): number | null {
    const regex = new RegExp(delimiter, 'g');
    let match: RegExpExecArray | null;
    let isOpen = false;
    let lastOpenIndex: number | null = null;

    while ((match = regex.exec(content)) !== null) {
        isOpen = !isOpen;
        if (isOpen) {
            lastOpenIndex = match.index;
        } else {
            lastOpenIndex = null;
        }
    }

    return isOpen ? lastOpenIndex : null;
}

/**
 * Detects an incomplete inline image prompt markup that references `?image-prompt`.
 * Matches the last occurrence of `![alt](?image-prompt=...)` that still misses the closing `)`.
 */
function findLastIncompleteImagePrompt(content: string): number | null {
    const marker = '(?image-prompt=';
    const markerIndex = content.lastIndexOf(marker);
    if (markerIndex === -1) {
        return null;
    }

    const closingParenIndex = content.indexOf(')', markerIndex);
    if (closingParenIndex !== -1) {
        return null;
    }

    const startIndex = content.lastIndexOf('![', markerIndex);
    if (startIndex === -1) {
        return null;
    }

    return startIndex;
}

/**
 * Locates an unmatched double-dollar math delimiter (`$$`) that is still open.
 */
function findLastUnclosedDoubleDollar(content: string): number | null {
    const regex = /\$\$/g;
    let match: RegExpExecArray | null;
    let isOpen = false;
    let lastOpenIndex: number | null = null;

    while ((match = regex.exec(content)) !== null) {
        isOpen = !isOpen;
        if (isOpen) {
            lastOpenIndex = match.index;
        } else {
            lastOpenIndex = null;
        }
    }

    return isOpen ? lastOpenIndex : null;
}

/**
 * Determines the furthest streaming feature marker that should be hidden until the message completes.
 */
function findLatestStreamingFeatureBoundary(content: string): number | null {
    const candidates = [
        findLastUnclosedFence(content, '```'),
        findLastUnclosedFence(content, '~~~'),
        findLastIncompleteImagePrompt(content),
        findLastUnclosedDoubleDollar(content),
    ].filter((index): index is number => index !== null);

    if (candidates.length === 0) {
        return null;
    }

    return Math.max(...candidates);
}

/**
 * Trims trailing rich-feature markup from streaming messages so users do not see raw source while the feature is being generated.
 *
 * @param content - Full markdown text produced by the assistant.
 * @param options - Sanitization options (streaming state).
 * @returns Text that is safe to render during streaming.
 * @private internal helper of <ChatMessageItem/>
 */
export function sanitizeStreamingMessageContent(
    content: string,
    options: SanitizeStreamingMessageContentOptions = {},
): string {
    const isComplete = options.isComplete ?? true;
    if (isComplete) {
        return content;
    }

    const boundaryIndex = findLatestStreamingFeatureBoundary(content);
    if (boundaryIndex === null) {
        return content;
    }

    return content.slice(0, boundaryIndex).replace(/\s+$/, '');
}
