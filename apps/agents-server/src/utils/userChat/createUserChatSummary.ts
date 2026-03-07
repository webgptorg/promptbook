import type { UserChatRecord, UserChatSummary } from './UserChatRecord';
import { shortenText } from '../shortenText';
import { textToPreviewText } from '../textToPreviewText';

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
 * Builds chat list metadata from a full record.
 */
export function createUserChatSummary(chat: UserChatRecord): UserChatSummary {
    const firstUserMessage = chat.messages.find((message) => isUserMessageSender(message.sender));
    const lastMessage = [...chat.messages].reverse().find((message) => textToPreviewText(message.content).length > 0);
    const titleSource = textToPreviewText(firstUserMessage?.content || '');
    const previewSource = textToPreviewText(lastMessage?.content || '');

    return {
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        messagesCount: chat.messages.length,
        title: shortenText(titleSource || DEFAULT_CHAT_TITLE, CHAT_TITLE_MAX_LENGTH),
        preview: shortenText(previewSource, CHAT_PREVIEW_MAX_LENGTH),
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
