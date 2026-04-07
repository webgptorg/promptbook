import type { UserChatRecord, UserChatSummary, UserChatTimeoutActivity } from './UserChatRecord';
import { createUserChatRunningActivity } from './createUserChatRunningActivity';
import { shortenText } from '../shortenText';
import { textToPreviewText } from '../textToPreviewText';
import { isFrozenUserChatSource } from './UserChatSource';

/**
 * Max title length in chat list.
 *
 * @private function of `createUserChatSummary`
 */
const CHAT_TITLE_MAX_LENGTH = 64;

/**
 * Max preview length in chat list.
 *
 * @private function of `createUserChatSummary`
 */
const CHAT_PREVIEW_MAX_LENGTH = 96;

/**
 * Human fallback for untitled chats.
 *
 * @private function of `createUserChatSummary`
 */
const DEFAULT_CHAT_TITLE = 'New chat';

/**
 * Fallback timeout activity metadata used when a chat has no active timeouts.
 *
 * @private function of `createUserChatSummary`
 */
const EMPTY_TIMEOUT_ACTIVITY: UserChatTimeoutActivity = {
    count: 0,
    nearestDueAt: null,
};

/**
 * Maximum age of one external running indicator before summaries treat it as stale.
 *
 * @private function of `createUserChatSummary`
 */
const SUMMARY_RUNNING_ACTIVITY_MAX_AGE_MS = 6 * 60 * 1_000;

/**
 * Optional activity metadata that can be injected while building one chat summary.
 *
 * @private function of `createUserChatSummary`
 */
type CreateUserChatSummaryOptions = {
    timeoutActivity?: UserChatTimeoutActivity;
    activeJobCount?: number;
};

/**
 * Lightweight seed used to build one chat summary without hydrating full messages.
 *
 * @private function of `createUserChatSummary`
 */
export type UserChatSummarySeed = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    title: string | null;
    source: UserChatRecord['source'];
    messagesCount: number;
    firstUserMessageContent: string;
    lastPreviewMessageContent: string;
    pendingAssistantMessageCount: number;
};

/**
 * Builds chat list metadata from a full record.
 */
export function createUserChatSummary(
    chat: UserChatRecord,
    options: CreateUserChatSummaryOptions = {},
): UserChatSummary {
    const firstUserMessage = chat.messages.find((message) => isUserMessageSender(message.sender));
    const lastMessage = [...chat.messages].reverse().find((message) => textToPreviewText(message.content).length > 0);
    const pendingAssistantMessageCount = createUserChatRunningActivity(chat).count;

    return createUserChatSummaryFromSeed(
        {
            id: chat.id,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            lastMessageAt: chat.lastMessageAt,
            title: chat.title,
            source: chat.source,
            messagesCount: chat.messages.length,
            firstUserMessageContent: firstUserMessage?.content || '',
            lastPreviewMessageContent: lastMessage?.content || '',
            pendingAssistantMessageCount,
        },
        options,
    );
}

/**
 * Builds chat list metadata from one lightweight summary seed.
 */
export function createUserChatSummaryFromSeed(
    chat: UserChatSummarySeed,
    options: CreateUserChatSummaryOptions = {},
): UserChatSummary {
    const timeoutActivity = options.timeoutActivity || EMPTY_TIMEOUT_ACTIVITY;
    const storedTitle = textToPreviewText(chat.title || '');
    const titleSource = textToPreviewText(chat.firstUserMessageContent || '');
    const previewSource = textToPreviewText(chat.lastPreviewMessageContent || '');
    const runningActivityCount =
        options.activeJobCount && options.activeJobCount > 0
            ? options.activeJobCount
            : resolveSummaryPendingActivityCount(chat.updatedAt, chat.pendingAssistantMessageCount);

    return {
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        source: chat.source,
        isReadOnly: isFrozenUserChatSource(chat.source),
        messagesCount: chat.messagesCount,
        title: shortenText(storedTitle || titleSource || DEFAULT_CHAT_TITLE, CHAT_TITLE_MAX_LENGTH),
        preview: shortenText(previewSource, CHAT_PREVIEW_MAX_LENGTH),
        runningActivity: {
            count: runningActivityCount,
        },
        timeoutActivity,
    };
}

/**
 * Checks whether sender id represents a user-authored message.
 *
 * @private function of `createUserChatSummary`
 */
function isUserMessageSender(sender: unknown): boolean {
    if (typeof sender !== 'string') {
        return false;
    }

    return sender.toUpperCase() === 'USER';
}

/**
 * Resolves summary-level pending activity while ignoring stale external placeholders.
 *
 * @private function of `createUserChatSummary`
 */
function resolveSummaryPendingActivityCount(updatedAt: string, pendingAssistantMessageCount: number): number {
    if (!Number.isFinite(pendingAssistantMessageCount) || pendingAssistantMessageCount <= 0) {
        return 0;
    }

    const updatedAtTimestamp = Date.parse(updatedAt);
    if (!Number.isFinite(updatedAtTimestamp)) {
        return 0;
    }

    if (Date.now() - updatedAtTimestamp > SUMMARY_RUNNING_ACTIVITY_MAX_AGE_MS) {
        return 0;
    }

    return Math.floor(pendingAssistantMessageCount);
}
