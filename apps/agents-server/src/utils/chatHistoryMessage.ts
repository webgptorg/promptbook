/**
 * Maximum number of characters used for a generated chat thread title.
 *
 * @private constant of `createChatHistoryThreadTitle`
 */
const CHAT_HISTORY_THREAD_TITLE_MAX_LENGTH = 80;

/**
 * One raw `ChatHistory` row used when grouping recorded messages into chat threads.
 *
 * This is intentionally a minimal shape so it can be produced from a lightweight
 * `select` and reused on both the server (grouping) and the client (typing).
 */
export type ChatHistoryThreadSourceRow = {
    /**
     * Numeric id of the recorded message.
     */
    readonly id: number;
    /**
     * ISO timestamp when the message was recorded.
     */
    readonly createdAt: string;
    /**
     * Name of the agent the message belongs to.
     */
    readonly agentName: string;
    /**
     * Canonical chat id (thread identifier) or `null` for legacy unthreaded rows.
     */
    readonly chatId: string | null;
    /**
     * Recorded message payload (role/sender/content or a raw string).
     */
    readonly message: unknown;
};

/**
 * One recorded chat thread grouped from `ChatHistory` rows sharing the same `chatId`.
 */
export type ChatHistoryThread = {
    /**
     * Canonical chat id shared by every message of the thread.
     */
    readonly chatId: string;
    /**
     * Name of the agent the thread belongs to.
     */
    readonly agentName: string;
    /**
     * Human-readable title derived from the first user message of the thread.
     */
    readonly title: string;
    /**
     * Number of recorded messages in the thread.
     */
    readonly messageCount: number;
    /**
     * ISO timestamp of the first recorded message.
     */
    readonly firstMessageAt: string;
    /**
     * ISO timestamp of the last recorded message.
     */
    readonly lastMessageAt: string;
};

/**
 * Resolves the sender used by `<Chat/>`/`<MockedChat/>` from one recorded message.
 *
 * @param message - Raw recorded message payload.
 * @returns `USER` for user turns, `ASSISTANT` otherwise.
 *
 * @public shared by the admin chat-history views and the threads API
 */
export function resolveChatHistoryMessageSender(message: unknown): 'USER' | 'ASSISTANT' {
    const role = ((message as { role?: string })?.role || 'USER').toUpperCase();
    return role === 'USER' ? 'USER' : 'ASSISTANT';
}

/**
 * Resolves the raw role label of one recorded message for the table view.
 *
 * @param message - Raw recorded message payload.
 * @returns The stored role string, or `-` when it is missing.
 *
 * @public shared by the admin chat-history views
 */
export function resolveChatHistoryMessageRole(message: unknown): string {
    if (!message || typeof message !== 'object') {
        return '-';
    }

    return (message as { role?: string }).role || '-';
}

/**
 * Extracts the full textual content of one recorded message.
 *
 * Supports raw strings, `{ content }`/`{ text }` objects and array content parts,
 * falling back to a JSON serialization so nothing is silently dropped.
 *
 * @param message - Raw recorded message payload.
 * @returns The message text (may be an empty string).
 *
 * @public shared by the admin chat-history views and the threads API
 */
export function resolveChatHistoryMessageText(message: unknown): string {
    if (message == null) {
        return '';
    }

    if (typeof message === 'string') {
        return message;
    }

    if (typeof message === 'object') {
        const content = (message as { content?: unknown }).content ?? (message as { text?: unknown }).text ?? message;

        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content.map((part) => (typeof part === 'string' ? part : JSON.stringify(part))).join(' ');
        }

        return JSON.stringify(content);
    }

    return String(message);
}

/**
 * Builds a compact single-line title from one message text.
 *
 * @param text - Source message text.
 * @returns A whitespace-collapsed, length-limited title.
 *
 * @public shared by the threads API and the admin chat-history views
 */
export function createChatHistoryThreadTitle(text: string): string {
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    if (normalizedText.length === 0) {
        return 'Untitled chat';
    }

    if (normalizedText.length > CHAT_HISTORY_THREAD_TITLE_MAX_LENGTH) {
        return `${normalizedText.slice(0, CHAT_HISTORY_THREAD_TITLE_MAX_LENGTH)}…`;
    }

    return normalizedText;
}

/**
 * Returns the epoch milliseconds of an ISO timestamp, or `0` when it cannot be parsed.
 *
 * @private utility of `groupChatHistoryThreads`
 */
function resolveTimestampMs(isoTimestamp: string): number {
    const timestampMs = new Date(isoTimestamp).getTime();
    return Number.isNaN(timestampMs) ? 0 : timestampMs;
}

/**
 * Groups recorded `ChatHistory` rows into chat threads keyed by `chatId`.
 *
 * Rows without a `chatId` (legacy unthreaded messages) are ignored because they
 * cannot be attributed to a single conversation. The returned threads are sorted
 * by most recent activity first, and their title is taken from the first user
 * message so the list reads like the chat sidebar.
 *
 * @param rows - Minimal `ChatHistory` rows to group.
 * @returns Chat threads sorted by last activity descending.
 *
 * @public used by the threads API and covered by unit tests
 */
export function groupChatHistoryThreads(rows: ReadonlyArray<ChatHistoryThreadSourceRow>): ChatHistoryThread[] {
    const rowsByChatId = new Map<string, ChatHistoryThreadSourceRow[]>();

    for (const row of rows) {
        if (!row.chatId) {
            continue;
        }

        const bucket = rowsByChatId.get(row.chatId);
        if (bucket) {
            bucket.push(row);
        } else {
            rowsByChatId.set(row.chatId, [row]);
        }
    }

    const threads: ChatHistoryThread[] = [];

    for (const [chatId, bucketRows] of rowsByChatId) {
        const orderedRows = [...bucketRows].sort(
            (rowA, rowB) => resolveTimestampMs(rowA.createdAt) - resolveTimestampMs(rowB.createdAt),
        );

        const firstRow = orderedRows[0]!;
        const lastRow = orderedRows[orderedRows.length - 1]!;
        const titleRow = orderedRows.find((row) => resolveChatHistoryMessageSender(row.message) === 'USER') ?? firstRow;

        threads.push({
            chatId,
            agentName: firstRow.agentName,
            title: createChatHistoryThreadTitle(resolveChatHistoryMessageText(titleRow.message)),
            messageCount: orderedRows.length,
            firstMessageAt: firstRow.createdAt,
            lastMessageAt: lastRow.createdAt,
        });
    }

    threads.sort((threadA, threadB) => resolveTimestampMs(threadB.lastMessageAt) - resolveTimestampMs(threadA.lastMessageAt));

    return threads;
}
