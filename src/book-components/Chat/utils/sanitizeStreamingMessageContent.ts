/**
 * Options that customize how streaming message content is sanitized.
 */
type SanitizeStreamingMessageContentOptions = {
    /**
     * Whether the chat message has finished streaming.
     */
    isComplete?: boolean;
};

type FenceDelimiter = '```' | '~~~';

type CodeFenceStreamingBoundary = {
    readonly kind: 'codeFence';
    readonly index: number;
    readonly delimiter: FenceDelimiter;
};

type MathStreamingBoundary = {
    readonly kind: 'math';
    readonly index: number;
};

type ImagePromptStreamingBoundary = {
    readonly kind: 'imagePrompt';
    readonly index: number;
};

/**
 * Metadata describing the most-recently introduced rich feature that is still streaming.
 *
 * @private internal helper of <ChatMessageItem/>
 */
export type StreamingFeatureBoundary =
    | CodeFenceStreamingBoundary
    | MathStreamingBoundary
    | ImagePromptStreamingBoundary;

/**
 * Searches for the last unclosed code fence using the provided delimiter.
 */
function findLastUnclosedFence(content: string, delimiter: FenceDelimiter): CodeFenceStreamingBoundary | null {
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

    if (isOpen && lastOpenIndex !== null) {
        return {
            kind: 'codeFence',
            index: lastOpenIndex,
            delimiter,
        };
    }

    return null;
}

/**
 * Detects an incomplete inline image prompt markup that references `?image-prompt`.
 */
function findLastIncompleteImagePrompt(content: string): ImagePromptStreamingBoundary | null {
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

    return {
        kind: 'imagePrompt',
        index: startIndex,
    };
}

/**
 * Locates an unmatched double-dollar math delimiter (`$$`) that is still open.
 */
function findLastUnclosedDoubleDollar(content: string): MathStreamingBoundary | null {
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

    if (isOpen && lastOpenIndex !== null) {
        return {
            kind: 'math',
            index: lastOpenIndex,
        };
    }

    return null;
}

/**
 * Examines the latest streaming feature boundary so rich placeholders can be rendered while content is still being produced.
 *
 * @param content - Message text that may still be streaming.
 * @returns Metadata describing the richest streaming feature or `null` when nothing is being hidden.
 * @private internal helper of <ChatMessageItem/>
 */
export function getLatestStreamingFeatureBoundary(content: string): StreamingFeatureBoundary | null {
    const candidates: Array<StreamingFeatureBoundary | null> = [
        findLastUnclosedFence(content, '```'),
        findLastUnclosedFence(content, '~~~'),
        findLastIncompleteImagePrompt(content),
        findLastUnclosedDoubleDollar(content),
    ];

    const validCandidates = candidates.filter((candidate): candidate is StreamingFeatureBoundary => candidate !== null);
    if (validCandidates.length === 0) {
        return null;
    }

    return validCandidates.reduce((latest, candidate) => (candidate.index > latest.index ? candidate : latest));
}

/**
 * Trims trailing rich-feature markup from streaming messages so users do not see the raw source while the feature loads.
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

    const boundary = getLatestStreamingFeatureBoundary(content);
    if (boundary === null) {
        return content;
    }

    return content.slice(0, boundary.index).replace(/\s+$/, '');
}
