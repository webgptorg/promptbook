/**
 * Default browser-tab title used for chat pages when no specific chat session title is known.
 */
export const DEFAULT_CHAT_PAGE_TITLE = 'Chat';

/**
 * Delimiter used by composed browser-title segments.
 */
const TITLE_SEGMENT_SEPARATOR = ' | ';

/**
 * Formats the current chat context as a browser-tab title.
 *
 * @param activeChatTitle - Current durable chat title, when available.
 * @param untitledChatTitle - Localized untitled-chat label used by the UI.
 * @returns Chat-focused leading title segment used ahead of inherited agent/server context.
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

    return normalizedChatTitle;
}

/**
 * Rebuilds the full document title while preserving inherited agent/server title segments.
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
    const normalizedAgentTitle = normalizeOptionalTitle(agentTitle);
    const titleSegments = splitDocumentTitleSegments(baseDocumentTitle);
    const chatSegmentIndex = findTitleSegmentIndex(titleSegments, DEFAULT_CHAT_PAGE_TITLE);
    const agentSegmentIndex = findTitleSegmentIndex(titleSegments, normalizedAgentTitle);

    if (titleSegments.length === 0) {
        return joinDocumentTitleSegments([chatPageTitle, normalizedAgentTitle]);
    }

    if (chatSegmentIndex !== -1) {
        const nextTitleSegments = [...titleSegments];
        nextTitleSegments[chatSegmentIndex] = chatPageTitle;
        if (normalizedAgentTitle && agentSegmentIndex === -1) {
            nextTitleSegments.splice(chatSegmentIndex + 1, 0, normalizedAgentTitle);
        }
        return joinDocumentTitleSegments(nextTitleSegments);
    }

    if (agentSegmentIndex !== -1) {
        const nextTitleSegments = [...titleSegments];
        nextTitleSegments.splice(agentSegmentIndex, 0, chatPageTitle);
        return joinDocumentTitleSegments(nextTitleSegments);
    }

    return joinDocumentTitleSegments([chatPageTitle, normalizedAgentTitle, ...titleSegments]);
}

/**
 * Splits one composed browser title into normalized segments.
 *
 * @param value - Raw browser-title string.
 * @returns Ordered normalized title segments.
 */
function splitDocumentTitleSegments(value: string | null | undefined): Array<string> {
    const normalizedValue = normalizeOptionalTitle(value);
    if (!normalizedValue) {
        return [];
    }

    return normalizedValue
        .split(TITLE_SEGMENT_SEPARATOR)
        .map((segment) => normalizeOptionalTitle(segment))
        .filter((segment): segment is string => segment !== null);
}

/**
 * Joins normalized browser-title segments back into one composed string.
 *
 * @param segments - Ordered title segments.
 * @returns Joined browser-title string.
 */
function joinDocumentTitleSegments(segments: ReadonlyArray<string | null | undefined>): string {
    return segments
        .map((segment) => normalizeOptionalTitle(segment))
        .filter((segment): segment is string => segment !== null)
        .join(TITLE_SEGMENT_SEPARATOR);
}

/**
 * Finds one normalized title segment inside a composed browser title.
 *
 * @param segments - Current title segments.
 * @param targetSegment - Segment to find.
 * @returns Matching segment index or `-1` when absent.
 */
function findTitleSegmentIndex(
    segments: ReadonlyArray<string>,
    targetSegment: string | null | undefined,
): number {
    const normalizedTargetSegment = normalizeOptionalTitle(targetSegment);
    if (!normalizedTargetSegment) {
        return -1;
    }

    return segments.findIndex((segment) => segment === normalizedTargetSegment);
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
