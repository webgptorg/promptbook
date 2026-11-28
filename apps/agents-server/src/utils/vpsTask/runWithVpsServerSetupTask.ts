import { buildVpsServerSetupAdminChatTaskId, VPS_SERVER_SETUP_ADMIN_CHAT_TASK_ID_PREFIX } from '../adminChatTaskLinks';
import type { AdminChatTaskRecord } from '../chatTasksAdmin';
import { appendVpsServerSetupTask, finishVpsServerSetupTask } from './vpsTaskHistory';
import type { VpsServerSetupTaskOptions, VpsServerSetupTaskResult } from './vpsTaskTypes';

/**
 * Queue name shown for VPS server setup and certificate-maintenance tasks.
 *
 * @private constant of `runWithVpsServerSetupTask`
 */
export const VPS_SERVER_SETUP_TASK_QUEUE_NAME = 'vps-server-setup';

/**
 * Runs one VPS operation while recording its common task-manager lifecycle fields.
 *
 * The task is persisted before the operation starts and is completed in both the normal and
 * exceptional paths. Persistence failures are deliberately observational: task logging must
 * never prevent server setup or certificate maintenance from running.
 *
 * @param options - Task display and target metadata.
 * @param operation - VPS operation to execute.
 * @param resolveResult - Optional result-status resolver for APIs that return failures instead of throwing.
 * @returns The operation result.
 *
 * @private internal utility of Agents Server
 */
export async function runWithVpsServerSetupTask<Result>(
    options: VpsServerSetupTaskOptions,
    operation: () => Promise<Result>,
    resolveResult: (result: Result) => boolean | VpsServerSetupTaskResult = () => true,
): Promise<Result> {
    const task = createVpsServerSetupTaskRecord(options);
    let isTaskPersisted = false;

    try {
        await appendVpsServerSetupTask(task);
        isTaskPersisted = true;
    } catch (error) {
        console.error('[admin-chat-task] failed to persist VPS server setup task start', error);
    }

    try {
        const result = await operation();
        const taskResult = normalizeVpsServerSetupTaskResult(resolveResult(result));
        if (isTaskPersisted) {
            await finishVpsServerSetupTaskSafely(task.id, taskResult);
        }
        return result;
    } catch (error) {
        if (isTaskPersisted) {
            await finishVpsServerSetupTaskSafely(task.id, {
                isSuccessful: false,
                errorSummary: resolveVpsTaskErrorSummary(error),
                errorDetails: resolveVpsTaskErrorDetails(error),
            });
        }
        throw error;
    }
}

/**
 * Creates the complete task-manager row written at operation start.
 *
 * @param options - Task display and target metadata.
 * @returns Running task row.
 *
 * @private function of `runWithVpsServerSetupTask`
 */
function createVpsServerSetupTaskRecord(options: VpsServerSetupTaskOptions): AdminChatTaskRecord {
    const timestamp = new Date().toISOString();
    const taskId = buildVpsServerSetupAdminChatTaskId(createVpsServerSetupTaskIdentity(timestamp));

    return {
        id: taskId,
        kind: 'VPS_SERVER_SETUP',
        status: 'RUNNING',
        createdAt: timestamp,
        queuedAt: timestamp,
        startedAt: timestamp,
        updatedAt: timestamp,
        finishedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: timestamp,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: null,
        userId: 0,
        username: null,
        agentPermanentId: taskId,
        agentName: options.taskName,
        chatId: options.chatId,
        workerId: String(process.pid),
        queueName: VPS_SERVER_SETUP_TASK_QUEUE_NAME,
        serverName: options.serverName ?? null,
        serverDomain: options.serverDomain ?? null,
    };
}

/**
 * Creates a unique identity for one task-history row.
 *
 * @param startedAt - Task start timestamp used by the fallback identity.
 * @returns Task identity.
 *
 * @private function of `createVpsServerSetupTaskRecord`
 */
function createVpsServerSetupTaskIdentity(startedAt: string): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `${startedAt.replace(/[^0-9]/gu, '')}-${process.pid}-${Math.floor(
        Math.random() * Number.MAX_SAFE_INTEGER,
    ).toString(36)}`;
}

/**
 * Normalizes the supported task-result resolver return forms.
 *
 * @param result - Boolean or detailed task result.
 * @returns Detailed task result.
 *
 * @private function of `runWithVpsServerSetupTask`
 */
function normalizeVpsServerSetupTaskResult(result: boolean | VpsServerSetupTaskResult): VpsServerSetupTaskResult {
    return typeof result === 'boolean' ? { isSuccessful: result } : result;
}

/**
 * Persists one terminal task state without changing the wrapped operation result.
 *
 * @param taskId - Task identifier.
 * @param taskResult - Terminal task fields.
 * @returns Promise that resolves after persistence or logging.
 *
 * @private function of `runWithVpsServerSetupTask`
 */
async function finishVpsServerSetupTaskSafely(taskId: string, taskResult: VpsServerSetupTaskResult): Promise<void> {
    const finishedAt = new Date().toISOString();
    try {
        await finishVpsServerSetupTask(taskId, {
            status: taskResult.isSuccessful ? 'COMPLETED' : 'FAILED',
            finishedAt,
            updatedAt: finishedAt,
            lastErrorSummary: taskResult.isSuccessful ? null : taskResult.errorSummary || 'VPS operation failed.',
            lastErrorDetails: taskResult.isSuccessful ? null : taskResult.errorDetails || null,
        });
    } catch (error) {
        console.error('[admin-chat-task] failed to persist VPS server setup task completion', error);
    }
}

/**
 * Extracts a compact error summary for a failed VPS task.
 *
 * @param error - Unknown operation error.
 * @returns Error summary.
 *
 * @private function of `runWithVpsServerSetupTask`
 */
function resolveVpsTaskErrorSummary(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Extracts detailed error text for a failed VPS task.
 *
 * @param error - Unknown operation error.
 * @returns Error details.
 *
 * @private function of `runWithVpsServerSetupTask`
 */
function resolveVpsTaskErrorDetails(error: unknown): string {
    return error instanceof Error ? error.stack || error.message : String(error);
}

/**
 * Returns whether a task id belongs to a VPS server setup task.
 *
 * @param taskId - Candidate task identifier.
 * @returns `true` when the identifier uses the VPS setup prefix.
 *
 * @private internal utility of Agents Server
 */
export function isVpsServerSetupTaskId(taskId: string): boolean {
    return taskId.startsWith(`${VPS_SERVER_SETUP_ADMIN_CHAT_TASK_ID_PREFIX}:`);
}
