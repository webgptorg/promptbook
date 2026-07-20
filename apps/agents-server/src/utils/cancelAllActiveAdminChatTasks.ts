import { cancelAdminChatTaskById } from '@/src/utils/cancelAdminChatTaskById';
import { getAdminChatTasks } from '@/src/utils/getAdminChatTasksResponse/getAdminChatTasks';
import type { ParsedAdminChatTaskQuery } from '@/src/utils/getAdminChatTasksResponse/parseAdminChatTaskQuery';

/**
 * Number of active task rows loaded per page while collecting bulk cancellation targets.
 *
 * @private internal constant of `cancelAllActiveAdminChatTasks`
 */
const BULK_ADMIN_CHAT_TASK_PAGE_SIZE = 200;

/**
 * Hard cap for one bulk cancellation run.
 *
 * The cap protects runtime latency and prevents one admin action from cancelling an unbounded
 * number of tasks in a single request.
 *
 * @private internal constant of `cancelAllActiveAdminChatTasks`
 */
const MAX_BULK_ADMIN_CHAT_TASK_CANCEL_TARGETS = 2_000;

/**
 * Summary returned after bulk-cancelling every active durable chat task.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelAllActiveAdminChatTasksSummary = {
    /**
     * Number of active tasks that were selected for cancellation.
     */
    matchedCount: number;

    /**
     * Number of tasks whose cancellation was actually requested.
     */
    cancelledCount: number;

    /**
     * Whether more active tasks existed than the per-run cap allowed to cancel.
     */
    hasMore: boolean;
};

/**
 * Inputs required to bulk-cancel every active durable chat task on behalf of an administrator.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelAllActiveAdminChatTasksOptions = {
    /**
     * Human-readable actor recorded in the cancellation audit log.
     */
    actor: string;

    /**
     * Required operator-supplied reason recorded in the cancellation audit log.
     */
    reason: string;

    /**
     * Request origin used to wake the durable chat worker for running jobs.
     */
    requestOrigin: string;
};

/**
 * Cancels every active (queued or running) durable chat task across all users.
 *
 * The active task ids are collected up front so cancellations do not shift the pagination window,
 * then each task is cancelled by reusing the single-task admin cancellation flow.
 *
 * @param options - Audit metadata and request origin.
 * @returns Summary counters describing how many active tasks were matched and cancelled.
 * @private internal admin utility of Agents Server
 */
export async function cancelAllActiveAdminChatTasks(
    options: CancelAllActiveAdminChatTasksOptions,
): Promise<CancelAllActiveAdminChatTasksSummary> {
    const collectedActiveTasks = await collectActiveAdminChatTaskIds();
    let cancelledCount = 0;

    for (const taskId of collectedActiveTasks.taskIds) {
        const outcome = await cancelAdminChatTaskById({
            taskId,
            actor: options.actor,
            reason: options.reason,
            requestOrigin: options.requestOrigin,
        });

        if (outcome === 'CANCELLED') {
            cancelledCount += 1;
        }
    }

    return {
        matchedCount: collectedActiveTasks.taskIds.length,
        cancelledCount,
        hasMore: collectedActiveTasks.hasMore,
    };
}

/**
 * Collects one bounded snapshot of active durable chat-task ids for bulk cancellation.
 *
 * @returns The collected active task ids and whether the per-run cap truncated them.
 * @private function of `cancelAllActiveAdminChatTasks`
 */
async function collectActiveAdminChatTaskIds(): Promise<{ taskIds: Array<string>; hasMore: boolean }> {
    const collectedTaskIds: Array<string> = [];
    let page = 1;
    let totalActiveTaskCount = 0;

    while (collectedTaskIds.length < MAX_BULK_ADMIN_CHAT_TASK_CANCEL_TARGETS) {
        const activeTasks = await getAdminChatTasks(createActiveAdminChatTaskQuery(page));
        totalActiveTaskCount = activeTasks.total;

        if (activeTasks.items.length === 0) {
            break;
        }

        for (const task of activeTasks.items) {
            collectedTaskIds.push(task.id);
        }

        if (collectedTaskIds.length >= totalActiveTaskCount) {
            break;
        }

        page += 1;
    }

    const cappedTaskIds = collectedTaskIds.slice(0, MAX_BULK_ADMIN_CHAT_TASK_CANCEL_TARGETS);

    return {
        taskIds: cappedTaskIds,
        hasMore: totalActiveTaskCount > cappedTaskIds.length,
    };
}

/**
 * Builds the admin task query used to page through active durable chat tasks.
 *
 * @param page - One-based page number to load.
 * @returns Parsed admin task query scoped to the active view.
 * @private function of `cancelAllActiveAdminChatTasks`
 */
function createActiveAdminChatTaskQuery(page: number): ParsedAdminChatTaskQuery {
    return {
        page,
        pageSize: BULK_ADMIN_CHAT_TASK_PAGE_SIZE,
        view: 'active',
        search: '',
        sortBy: 'default',
        sortOrder: 'desc',
        timeWindowHours: 24,
    };
}
