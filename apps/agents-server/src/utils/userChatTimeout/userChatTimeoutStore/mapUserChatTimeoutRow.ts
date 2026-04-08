import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { normalizeRecurrenceIntervalMs } from './normalizeRecurrenceIntervalMs';
import { normalizeUserChatTimeoutParameters } from './normalizeUserChatTimeoutParameters';

/**
 * Maps one raw timeout row into an app-level record.
 *
 * @private function of userChatTimeoutStore
 */
export function mapUserChatTimeoutRow(row: UserChatTimeoutRow): UserChatTimeoutRecord {
    return {
        id: row.id,
        timeoutId: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        chatId: row.chatId,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        status: row.status,
        message: row.message,
        parameters: normalizeUserChatTimeoutParameters(row.parameters),
        durationMs: row.durationMs,
        dueAt: row.dueAt,
        recurrenceIntervalMs: normalizeRecurrenceIntervalMs(row.recurrenceIntervalMs),
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt || null,
        leaseExpiresAt: row.leaseExpiresAt,
        attemptCount: row.attemptCount,
        runCount: typeof row.runCount === 'number' ? row.runCount : 0,
        lastFiredAt: row.lastFiredAt || null,
        failureReason: row.failureReason,
    };
}
