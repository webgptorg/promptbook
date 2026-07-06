import type { AdminChatTaskRecord } from '../../chatTasksAdmin';
import { resolveNullableSqlNumber } from './adminChatTaskSqlValues';
import type {
    AdminChatTaskFallbackData,
    AdminChatTaskJobRow,
    AdminChatTaskTimeoutRow,
} from './loadAdminChatTaskFallbackData';

/**
 * Maps the raw SQLite fallback rows into the public admin task-manager row shape.
 *
 * @private function of `getAdminChatTasks`
 */
export function mapAdminChatTaskFallbackRows(fallbackData: AdminChatTaskFallbackData): Array<AdminChatTaskRecord> {
    const { jobRows, timeoutRows, usernamesById, agentNamesByPermanentId } = fallbackData;

    return [
        ...jobRows.map((row) => mapAdminChatTaskJobRow(row, usernamesById, agentNamesByPermanentId)),
        ...timeoutRows.map((row) => mapAdminChatTaskTimeoutRow(row, usernamesById, agentNamesByPermanentId)),
    ];
}

/**
 * Maps one SQLite-backed chat job into the public admin task row shape.
 *
 * @private function of `getAdminChatTasks`
 */
function mapAdminChatTaskJobRow(
    row: AdminChatTaskJobRow,
    usernamesById: ReadonlyMap<number, string>,
    agentNamesByPermanentId: ReadonlyMap<string, string | null>,
): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: 'CHAT_COMPLETION',
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: null,
        lastHeartbeatAt: row.lastHeartbeatAt,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.failureReason,
        lastErrorDetails: row.failureDetails ?? null,
        userId: row.userId,
        username: usernamesById.get(row.userId) ?? null,
        agentPermanentId: row.agentPermanentId,
        agentName: agentNamesByPermanentId.get(row.agentPermanentId) ?? null,
        chatId: row.chatId,
        workerId: null,
        queueName: 'user-chat-jobs',
    };
}

/**
 * Maps one SQLite-backed timeout into the public admin task row shape.
 *
 * @private function of `getAdminChatTasks`
 */
function mapAdminChatTaskTimeoutRow(
    row: AdminChatTaskTimeoutRow,
    usernamesById: ReadonlyMap<number, string>,
    agentNamesByPermanentId: ReadonlyMap<string, string | null>,
): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: 'CHAT_TIMEOUT',
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt,
        lastHeartbeatAt: null,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: resolveNullableSqlNumber(row.recurrenceIntervalMs),
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.failureReason,
        lastErrorDetails: null,
        userId: row.userId,
        username: usernamesById.get(row.userId) ?? null,
        agentPermanentId: row.agentPermanentId,
        agentName: agentNamesByPermanentId.get(row.agentPermanentId) ?? null,
        chatId: row.chatId,
        workerId: null,
        queueName: 'user-chat-timeouts',
    };
}
