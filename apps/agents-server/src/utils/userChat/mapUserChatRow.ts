import { Json } from '@/src/database/schema';
import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';

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
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
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

    return rawMessages as unknown as Array<ChatMessage>;
}
