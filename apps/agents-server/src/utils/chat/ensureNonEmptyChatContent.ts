/**
 * Options for ensuring chat content is not empty.
 */
export type EnsureNonEmptyChatContentOptions = {
    /**
     * Raw content returned from the model.
     */
    content: string | null | undefined;
    /**
     * Optional fallback message to use when content is empty.
     */
    fallbackMessage?: string;
    /**
     * Optional context label for logging.
     */
    context?: string;
};

/**
 * Result of normalizing chat content.
 */
export type EnsureNonEmptyChatContentResult = {
    /**
     * Normalized content that is guaranteed to be non-empty.
     */
    content: string;
    /**
     * True when the original content was empty and fallback was used.
     */
    wasEmpty: boolean;
};

const DEFAULT_FALLBACK_MESSAGE = 'Sorry, I could not generate a response. Please try again.';

/**
 * Ensures chat content is never empty by providing a fallback message when needed.
 */
export function ensureNonEmptyChatContent(
    options: EnsureNonEmptyChatContentOptions,
): EnsureNonEmptyChatContentResult {
    const rawContent = options.content ?? '';
    const isEmpty = rawContent.trim().length === 0;

    if (!isEmpty) {
        return {
            content: rawContent,
            wasEmpty: false,
        };
    }

    const fallbackMessage = options.fallbackMessage?.trim()
        ? options.fallbackMessage
        : DEFAULT_FALLBACK_MESSAGE;

    if (options.context) {
        console.warn(`[${options.context}] Empty model response; using fallback message.`);
    }

    return {
        content: fallbackMessage,
        wasEmpty: true,
    };
}
