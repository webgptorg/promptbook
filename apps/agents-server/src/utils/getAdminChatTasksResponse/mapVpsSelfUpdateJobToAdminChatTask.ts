import type { AdminChatTaskRecord } from '../chatTasksAdmin';
import type { UserChatJobStatus } from '../userChat/UserChatJobRecord';
import type { VpsSelfUpdateJobSnapshot } from '../vpsSelfUpdate';
import { resolveVpsSelfUpdateJobIdentity } from '../vpsSelfUpdate/vpsSelfUpdateJobIdentity';

/**
 * Stable synthetic task id prefix used for standalone VPS self-update task rows.
 *
 * @private internal admin utility of Agents Server
 */
export const VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID = 'vps-self-update';

/**
 * Synthetic queue name used for the standalone VPS self-update task row.
 *
 * @private internal admin utility of Agents Server
 */
export const VPS_SELF_UPDATE_ADMIN_CHAT_TASK_QUEUE_NAME = 'vps-self-update';

/**
 * Maps a persisted VPS self-update job snapshot to the admin task manager row shape.
 *
 * @param job - Latest persisted self-update job snapshot.
 * @returns Task manager row or `null` when no self-update has ever been triggered on this server.
 */
export function mapVpsSelfUpdateJobToAdminChatTask(job: VpsSelfUpdateJobSnapshot): AdminChatTaskRecord | null {
    const status = toAdminChatTaskStatus(job);
    if (!status) {
        return null;
    }

    const isTerminalStatus = status === 'COMPLETED' || status === 'FAILED';
    const startedAt = job.startedAt;
    // Report the real recorded finish time only; falling back to `startedAt` would render a
    // misleading zero-second total duration for a self-update whose finish time is unknown.
    const finishedAt = isTerminalStatus ? job.finishedAt : null;
    const updatedAt = finishedAt || startedAt || new Date().toISOString();
    const errorSummary = job.errorMessage || null;
    const currentStepDetails = job.currentStep || null;
    const triggerLabel = formatVpsSelfUpdateTrigger(job.trigger);
    const taskId = `${VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID}:${resolveVpsSelfUpdateJobIdentity(job)}`;

    return {
        id: taskId,
        kind: 'VPS_SELF_UPDATE',
        status,
        createdAt: startedAt || updatedAt,
        queuedAt: startedAt || updatedAt,
        startedAt,
        updatedAt,
        finishedAt,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: null,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: errorSummary,
        lastErrorDetails: currentStepDetails,
        userId: 0,
        username: null,
        agentPermanentId: taskId,
        agentName: `${triggerLabel} self-update: ${job.targetEnvironment.label}`,
        chatId: job.targetBranch || job.targetEnvironment.branch || VPS_SELF_UPDATE_ADMIN_CHAT_TASK_ID,
        workerId: job.pid !== null ? String(job.pid) : null,
        queueName: `${VPS_SELF_UPDATE_ADMIN_CHAT_TASK_QUEUE_NAME}:${job.trigger}`,
    };
}

/**
 * Formats one self-update trigger for task-manager display.
 *
 * @param trigger - Persisted self-update trigger.
 * @returns Capitalized trigger label.
 */
function formatVpsSelfUpdateTrigger(trigger: VpsSelfUpdateJobSnapshot['trigger']): string {
    return trigger === 'automatic' ? 'Automatic' : 'Manual';
}

/**
 * Maps the shell-owned self-update status to the durable chat-task status enum used by the admin task manager.
 *
 * @param job - Persisted self-update job snapshot.
 * @returns Equivalent durable chat-job status, or `null` when the job is idle (no run has been triggered yet).
 */
function toAdminChatTaskStatus(job: VpsSelfUpdateJobSnapshot): UserChatJobStatus | null {
    switch (job.status) {
        case 'running':
            return 'RUNNING';
        case 'succeeded':
            return 'COMPLETED';
        case 'failed':
            return 'FAILED';
        case 'idle':
            return null;
    }
}
