import { Json } from '@/src/database/schema';
import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { USER_CHAT_SOURCES } from './UserChatSource';
import { normalizeUserChatReplyReference } from './userChatReplies';

/**
 * Maps one raw database row into a typed chat record.
 *
 * @private function of `userChat`
 */
export function mapUserChatRow(row: UserChatRow): UserChatRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastMessageAt: row.lastMessageAt,
        title: row.title,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        source: row.source || USER_CHAT_SOURCES.WEB_UI,
        messages: normalizeStoredMessages(row.messages),
        draftMessage: row.draftMessage,
    };
}

/**
 * Safely parses persisted messages from JSONB.
 *
 * @private function of `userChat`
 */
function normalizeStoredMessages(rawMessages: Json): Array<ChatMessage> {
    if (!Array.isArray(rawMessages)) {
        return [];
    }

    return (rawMessages as unknown as Array<ChatMessage>).map((message) => {
        const normalizedReplyReference = normalizeUserChatReplyReference((message as { replyingTo?: unknown }).replyingTo);
        if (normalizedReplyReference === undefined) {
            const { replyingTo, ...restMessage } = message as ChatMessage & { replyingTo?: unknown };
            return replyingTo === undefined ? message : restMessage;
        }

        return {
            ...message,
            replyingTo: normalizedReplyReference,
        };
    });
}
