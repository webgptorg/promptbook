import { serializeError } from '@promptbook-local/utils';
import type { AdminChatTaskRecord } from '../chatTasksAdmin';
import { getAdminChatTasks } from '../getAdminChatTasksResponse/getAdminChatTasks';
import { getServerLimits } from '../serverLimits';
import type { UserChatJobRecord } from './UserChatJobRecord';
import {
    EXPIRED_RUNNING_USER_CHAT_JOB_RUNTIME_LIMITS,
    type ExpiredRunningUserChatJobFailureDiagnostics,
    type ExpiredRunningUserChatJobRuntimeSnapshot,
    type ExpiredRunningUserChatJobTaskSnapshotItem,
} from './createExpiredRunningUserChatJobFailureDiagnostics';

export { createExpiredRunningUserChatJobFailureDiagnostics } from './createExpiredRunningUserChatJobFailureDiagnostics';
export type {
    ExpiredRunningUserChatJobFailureDiagnostics,
    ExpiredRunningUserChatJobRuntimeSnapshot,
    ExpiredRunningUserChatJobTaskSnapshotItem,
} from './createExpiredRunningUserChatJobFailureDiagnostics';

/**
 * Maximum number of active background tasks captured in one expired-lease diagnostic snapshot.
 */
const EXPIRED_USER_CHAT_JOB_DIAGNOSTIC_TASK_LIMIT = 20;

/**
 * Time window passed to the shared admin task query when building diagnostics.
 */
const EXPIRED_USER_CHAT_JOB_DIAGNOSTIC_TIME_WINDOW_HOURS = 24;

/**
 * Loads the shared runtime snapshot used when diagnosing one or more expired running chat jobs.
 */
export async function loadExpiredRunningUserChatJobRuntimeSnapshot(): Promise<ExpiredRunningUserChatJobRuntimeSnapshot> {
    const recordedAt = new Date().toISOString();
    const [serverLimitsResult, activeTasksResult] = await Promise.allSettled([
        getServerLimits(),
        getAdminChatTasks({
            page: 1,
            pageSize: EXPIRED_USER_CHAT_JOB_DIAGNOSTIC_TASK_LIMIT,
            view: 'active',
            search: '',
            timeWindowHours: EXPIRED_USER_CHAT_JOB_DIAGNOSTIC_TIME_WINDOW_HOURS,
        }),
    ]);
    const loadErrors: NonNullable<ExpiredRunningUserChatJobRuntimeSnapshot['loadErrors']> = {};

    if (serverLimitsResult.status === 'rejected') {
        loadErrors.serverLimits = serializeError(serverLimitsResult.reason as Error);
    }

    if (activeTasksResult.status === 'rejected') {
        loadErrors.activeTasks = serializeError(activeTasksResult.reason as Error);
    }

    return {
        recordedAt,
        runtimeLimits: EXPIRED_RUNNING_USER_CHAT_JOB_RUNTIME_LIMITS,
        serverLimits: serverLimitsResult.status === 'fulfilled' ? serverLimitsResult.value : null,
        activeTasks:
            activeTasksResult.status === 'fulfilled'
                ? {
                      counters: activeTasksResult.value.counters,
                      totalActiveCount: activeTasksResult.value.total,
                      snapshotLimit: EXPIRED_USER_CHAT_JOB_DIAGNOSTIC_TASK_LIMIT,
                      isSnapshotTruncated: activeTasksResult.value.total > activeTasksResult.value.items.length,
                      items: activeTasksResult.value.items.map(mapExpiredRunningUserChatJobTaskSnapshotItem),
                  }
                : null,
        loadErrors: Object.keys(loadErrors).length > 0 ? loadErrors : null,
    };
}

/**
 * Emits one structured log entry for an expired running chat job.
 */
export function logExpiredRunningUserChatJob(options: {
    source: string;
    job: Pick<
        UserChatJobRecord,
        'id' | 'chatId' | 'userMessageId' | 'assistantMessageId' | 'userId' | 'agentPermanentId' | 'attemptCount'
    >;
    diagnostics: ExpiredRunningUserChatJobFailureDiagnostics;
}): void {
    console.error('[user-chat-job] lease_expired', {
        source: options.source,
        jobId: options.job.id,
        chatId: options.job.chatId,
        userId: options.job.userId,
        agentPermanentId: options.job.agentPermanentId,
        messageId: options.job.userMessageId,
        assistantMessageId: options.job.assistantMessageId,
        attemptCount: options.job.attemptCount,
        timings: options.diagnostics.timings,
        runtimeLimits: options.diagnostics.runtimeLimits,
        limitSignals: options.diagnostics.limitSignals,
        serverLimits: options.diagnostics.serverLimits,
        activeTaskCounters: options.diagnostics.activeTasks
            ? {
                  ...options.diagnostics.activeTasks.counters,
                  totalActiveCount: options.diagnostics.activeTasks.totalActiveCount,
                  snapshotLimit: options.diagnostics.activeTasks.snapshotLimit,
                  isSnapshotTruncated: options.diagnostics.activeTasks.isSnapshotTruncated,
              }
            : null,
        activeTasks: options.diagnostics.activeTasks?.items ?? [],
        diagnosticsLoadErrors: options.diagnostics.loadErrors,
    });
}

/**
 * Reduces one admin task row to the fields useful for lease-expiration diagnostics.
 */
function mapExpiredRunningUserChatJobTaskSnapshotItem(
    task: AdminChatTaskRecord,
): ExpiredRunningUserChatJobTaskSnapshotItem {
    return {
        id: task.id,
        kind: task.kind,
        status: task.status,
        userId: task.userId,
        username: task.username,
        agentPermanentId: task.agentPermanentId,
        agentName: task.agentName,
        chatId: task.chatId,
        queueName: task.queueName,
        attemptCount: task.attemptCount,
        queuedAt: task.queuedAt,
        startedAt: task.startedAt,
        updatedAt: task.updatedAt,
        cancelRequestedAt: task.cancelRequestedAt,
        pausedAt: task.pausedAt,
        lastHeartbeatAt: task.lastHeartbeatAt,
        leaseExpiresAt: task.leaseExpiresAt,
    };
}
