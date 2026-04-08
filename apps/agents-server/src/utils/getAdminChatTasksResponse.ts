import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import type { AdminChatTaskListResponse } from './chatTasksAdmin';
import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { parseAdminChatTaskQuery } from './getAdminChatTasksResponse/parseAdminChatTaskQuery';
import { throttledAdminRecovery } from './getAdminChatTasksResponse/throttledAdminRecovery';

/**
 * Successful task-manager response envelope.
 *
 * @private internal admin utility of Agents Server
 */
type GetAdminChatTasksResponseSuccess = {
    status: 200;
    response: AdminChatTaskListResponse;
};

/**
 * Invalid task-manager request envelope.
 *
 * @private internal admin utility of Agents Server
 */
type GetAdminChatTasksResponseInvalid = {
    status: 400;
    error: string;
};

/**
 * Result type returned by the admin task-manager query builder.
 *
 * @private internal admin utility of Agents Server
 */
export type GetAdminChatTasksResponseResult = GetAdminChatTasksResponseSuccess | GetAdminChatTasksResponseInvalid;

/**
 * Builds the paginated admin task-manager payload from live durable worker state.
 *
 * @private internal admin utility of Agents Server
 */
export async function getAdminChatTasksResponse(
    searchParams: URLSearchParams,
): Promise<GetAdminChatTasksResponseResult> {
    const parsedQuery = parseAdminChatTaskQuery(searchParams);
    if (!parsedQuery) {
        return {
            status: 400,
            error: 'Invalid admin task query.',
        };
    }

    ensureUserChatTimeoutWorkerBootstrapped();

    // [🧠] Recovery operations are throttled to avoid hammering the DB on every admin poll
    await throttledAdminRecovery();

    const adminChatTasks = await getAdminChatTasks(parsedQuery);

    return {
        status: 200,
        response: {
            items: adminChatTasks.items,
            counters: adminChatTasks.counters,
            total: adminChatTasks.total,
            page: parsedQuery.page,
            pageSize: parsedQuery.pageSize,
            view: parsedQuery.view,
            search: parsedQuery.search,
            timeWindowHours: parsedQuery.timeWindowHours,
            generatedAt: new Date().toISOString(),
        },
    };
}
