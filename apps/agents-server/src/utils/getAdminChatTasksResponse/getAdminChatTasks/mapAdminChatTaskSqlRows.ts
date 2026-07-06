import type { AdminChatTaskCounters, AdminChatTaskRecord } from '../../chatTasksAdmin';
import type { UserChatJobStatus } from '../../userChat/UserChatJobRecord';
import { resolveNullableSqlNumber, resolveSqlCount } from './adminChatTaskSqlValues';

/**
 * Raw SQL row returned by the paginated admin task query.
 *
 * @private type of `getAdminChatTasks`
 */
export type AdminChatTaskSqlRow = {
    id: string;
    kind: 'CHAT_COMPLETION' | 'CHAT_TIMEOUT';
    status: UserChatJobStatus;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    finishedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    recurrenceIntervalMs: string | number | null;
    attemptCount: number;
    lastErrorSummary: string | null;
    lastErrorDetails: string | null;
    userId: number;
    username: string | null;
    agentPermanentId: string;
    agentName: string | null;
    chatId: string;
    totalCount: string | number;
};

/**
 * Raw SQL row returned by the task-manager counters query.
 *
 * @private type of `getAdminChatTasks`
 */
export type AdminChatTaskCountersSqlRow = {
    runningCount: string | number;
    queuedCount: string | number;
    failedLast24hCount: string | number;
    oldestQueuedAgeMs: string | number | null;
};

/**
 * Maps one SQL row into the public admin task-manager row shape.
 *
 * @private function of `getAdminChatTasks`
 */
export function mapAdminChatTaskSqlRow(row: AdminChatTaskSqlRow): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: row.kind,
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.finishedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt,
        lastHeartbeatAt: row.lastHeartbeatAt,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: resolveNullableSqlNumber(row.recurrenceIntervalMs),
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.lastErrorSummary,
        lastErrorDetails: row.lastErrorDetails,
        userId: row.userId,
        username: row.username,
        agentPermanentId: row.agentPermanentId,
        agentName: row.agentName,
        chatId: row.chatId,
        workerId: null,
        queueName: row.kind === 'CHAT_TIMEOUT' ? 'user-chat-timeouts' : 'user-chat-jobs',
    };
}

/**
 * Maps the aggregate counters SQL row into the API response shape.
 *
 * @private function of `getAdminChatTasks`
 */
export function mapAdminChatTaskCounters(row: AdminChatTaskCountersSqlRow | undefined): AdminChatTaskCounters {
    return {
        runningCount: resolveSqlCount(row?.runningCount),
        queuedCount: resolveSqlCount(row?.queuedCount),
        failedLast24hCount: resolveSqlCount(row?.failedLast24hCount),
        oldestQueuedAgeMs: resolveNullableSqlNumber(row?.oldestQueuedAgeMs),
    };
}
