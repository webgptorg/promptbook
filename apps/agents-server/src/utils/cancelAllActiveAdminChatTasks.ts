import { cancelAdminChatTaskById } from '@/src/utils/cancelAdminChatTaskById';
import { getAdminChatTasks } from '@/src/utils/getAdminChatTasksResponse/getAdminChatTasks';
import { getVpsAdminChatTasksResponse } from '@/src/utils/getVpsAdminChatTasksResponse';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
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

    /**
     * Whether active tasks should be collected across every registered server on the VPS.
     */
    isVpsWide?: boolean;
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
    const collectedActiveTasks = await collectActiveAdminChatTasks(options.isVpsWide ?? false);
    let cancelledCount = 0;

    for (const task of collectedActiveTasks.tasks) {
        const outcome = await cancelAdminChatTaskById({
            taskId: task.id,
            actor: options.actor,
            reason: options.reason,
            requestOrigin: options.requestOrigin,
            serverDomain: task.serverDomain,
        });

        if (outcome === 'CANCELLED') {
            cancelledCount += 1;
        }
    }

    return {
        matchedCount: collectedActiveTasks.tasks.length,
        cancelledCount,
        hasMore: collectedActiveTasks.hasMore,
    };
}

/**
 * Collects one bounded snapshot of active durable chat tasks for bulk cancellation.
 *
 * @returns The collected tasks and whether the per-run cap truncated them.
 * @private function of `cancelAllActiveAdminChatTasks`
 */
async function collectActiveAdminChatTasks(isVpsWide: boolean): Promise<{
    tasks: Array<AdminChatTaskRecord>;
    hasMore: boolean;
}> {
    const collectedTasks: Array<AdminChatTaskRecord> = [];
    let page = 1;
    let totalActiveTaskCount = 0;

    while (collectedTasks.length < MAX_BULK_ADMIN_CHAT_TASK_CANCEL_TARGETS) {
        const activeTasks = isVpsWide
            ? await getVpsAdminChatTasksResponse(createActiveAdminChatTaskSearchParams(page))
            : {
                  status: 200 as const,
                  response: {
                      ...(await getAdminChatTasks(createActiveAdminChatTaskQuery(page))),
                      generatedAt: new Date().toISOString(),
                  },
              };

        if (activeTasks.status !== 200) {
            break;
        }

        const activeTaskPage = activeTasks.response;
        totalActiveTaskCount = activeTaskPage.total;

        if (activeTaskPage.items.length === 0) {
            break;
        }

        collectedTasks.push(...activeTaskPage.items);

        if (collectedTasks.length >= totalActiveTaskCount) {
            break;
        }

        page += 1;
    }

    const cappedTasks = collectedTasks.slice(0, MAX_BULK_ADMIN_CHAT_TASK_CANCEL_TARGETS);

    return {
        tasks: cappedTasks,
        hasMore: totalActiveTaskCount > cappedTasks.length,
    };
}

/**
 * Converts the normalized active-task query into the URL-search format used by the VPS listing.
 *
 * @param page - One-based page number.
 * @returns Search parameters for the VPS-wide task listing.
 *
 * @private function of `cancelAllActiveAdminChatTasks`
 */
function createActiveAdminChatTaskSearchParams(page: number): URLSearchParams {
    const searchParams = new URLSearchParams();
    const query = createActiveAdminChatTaskQuery(page);

    for (const [key, value] of Object.entries(query)) {
        searchParams.set(key, String(value));
    }

    return searchParams;
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
