import { Json } from '@/src/database/schema';
import type { UserChatJobParameters, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';

/**
 * Maps one raw chat-job row into an app-level record.
 *
 * @private function of `userChat`
 */
export function mapUserChatJobRow(row: UserChatJobRow): UserChatJobRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        chatId: row.chatId,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        userMessageId: row.userMessageId,
        assistantMessageId: row.assistantMessageId,
        clientMessageId: row.clientMessageId,
        status: row.status,
        parameters: normalizeUserChatJobParameters(row.parameters),
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        lastHeartbeatAt: row.lastHeartbeatAt,
        leaseExpiresAt: row.leaseExpiresAt,
        attemptCount: row.attemptCount,
        provider: row.provider,
        failureReason: row.failureReason,
    };
}

/**
 * Normalizes persisted JSONB parameters for worker execution.
 *
 * @private function of `userChat`
 */
function normalizeUserChatJobParameters(rawParameters: Json): UserChatJobParameters {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        return {};
    }

    return rawParameters as UserChatJobParameters;
}
