import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import type { AdminChatTaskListResponse } from './chatTasksAdmin';
import {
    collectAdminChatTasksToInject,
    createInjectedAwareAdminChatTaskQuery,
    loadInjectableAdminChatTasks,
    mergeInjectedAdminChatTaskCounters,
    mergeInjectedAdminChatTasks,
} from './getAdminChatTasksResponse/adminChatTaskInjection';
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
 * This is the per-server view: it reports durable jobs for the current request's server plus the
 * process-local VPS tasks injected on top. The VPS-wide superadmin view lives in
 * `getVpsAdminChatTasksResponse`.
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

    const injectableTasks = await loadInjectableAdminChatTasks();
    const injectedTasks = collectAdminChatTasksToInject(injectableTasks, parsedQuery);
    const databaseQuery = createInjectedAwareAdminChatTaskQuery(parsedQuery, injectedTasks.length);
    const adminChatTasks = await getAdminChatTasks(databaseQuery);
    const { items, total } = mergeInjectedAdminChatTasks({
        databaseItems: adminChatTasks.items,
        databaseTotal: adminChatTasks.total,
        injectedTasks,
        page: parsedQuery.page,
        pageSize: parsedQuery.pageSize,
        query: parsedQuery,
    });
    const counters = mergeInjectedAdminChatTaskCounters(adminChatTasks.counters, injectableTasks);

    return {
        status: 200,
        response: {
            items,
            counters,
            total,
            page: parsedQuery.page,
            pageSize: parsedQuery.pageSize,
            view: parsedQuery.view,
            search: parsedQuery.search,
            sortBy: parsedQuery.sortBy,
            sortOrder: parsedQuery.sortOrder,
            timeWindowHours: parsedQuery.timeWindowHours,
            generatedAt: new Date().toISOString(),
        },
    };
}
