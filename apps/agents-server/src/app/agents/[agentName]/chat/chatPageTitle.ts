/**
 * Default browser-tab title used for chat pages when no specific chat session title is known.
 */
export const DEFAULT_CHAT_PAGE_TITLE = 'Chat';

/**
 * Formats the current chat context as a browser-tab title.
 *
 * @param activeChatTitle - Current durable chat title, when available.
 * @param untitledChatTitle - Localized untitled-chat label used by the UI.
 * @returns Chat-focused title string that never falls back to the agent name.
 */
export function createChatPageTitle(
    activeChatTitle?: string | null,
    untitledChatTitle?: string,
): string {
    const normalizedChatTitle = normalizeOptionalTitle(activeChatTitle);
    const normalizedUntitledChatTitle = normalizeOptionalTitle(untitledChatTitle);

    if (
        !normalizedChatTitle ||
        (normalizedUntitledChatTitle !== null &&
            normalizedChatTitle.toLocaleLowerCase() === normalizedUntitledChatTitle.toLocaleLowerCase())
    ) {
        return DEFAULT_CHAT_PAGE_TITLE;
    }

    return `${DEFAULT_CHAT_PAGE_TITLE}: ${normalizedChatTitle}`;
}

/**
 * Rebuilds the full document title while preserving any existing suffix/prefix around the chat context.
 *
 * @param options - Base title and current chat context.
 * @returns Updated full document title.
 */
export function createChatDocumentTitle(options: {
    baseDocumentTitle?: string | null;
    agentTitle?: string | null;
    activeChatTitle?: string | null;
    untitledChatTitle?: string;
}): string {
    const { baseDocumentTitle, agentTitle, activeChatTitle, untitledChatTitle } = options;
    const chatPageTitle = createChatPageTitle(activeChatTitle, untitledChatTitle);
    const normalizedBaseDocumentTitle = normalizeOptionalTitle(baseDocumentTitle);

    if (!normalizedBaseDocumentTitle) {
        return chatPageTitle;
    }

    for (const currentContextTitle of [agentTitle, DEFAULT_CHAT_PAGE_TITLE]) {
        const normalizedCurrentContextTitle = normalizeOptionalTitle(currentContextTitle);
        if (!normalizedCurrentContextTitle) {
            continue;
        }

        if (!normalizedBaseDocumentTitle.includes(normalizedCurrentContextTitle)) {
            continue;
        }

        return normalizedBaseDocumentTitle.replace(normalizedCurrentContextTitle, chatPageTitle);
    }

    return chatPageTitle;
}

/**
 * Normalizes an optional title-like string to a trimmed value.
 *
 * @param value - Raw value to normalize.
 * @returns Trimmed title or `null` when empty.
 */
function normalizeOptionalTitle(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
}
