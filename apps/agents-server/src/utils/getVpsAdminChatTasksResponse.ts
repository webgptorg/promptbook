import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import { mapRegisteredServerContexts } from '../tools/mapRegisteredServerContexts';
import type { ServerRecord } from './serverRegistry';
import type { AdminChatTaskCounters, AdminChatTaskListResponse, AdminChatTaskRecord } from './chatTasksAdmin';
import type { GetAdminChatTasksResponseResult } from './getAdminChatTasksResponse';
import {
    addAdminChatTaskCounters,
    collectAdminChatTasksToInject,
    expandAdminChatTaskQueryToPageSpan,
    loadInjectableAdminChatTasks,
    mergeInjectedAdminChatTaskCounters,
} from './getAdminChatTasksResponse/adminChatTaskInjection';
import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { compareAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks';
import type { GetAdminChatTasksData } from './getAdminChatTasksResponse/getAdminChatTasks';
import { parseAdminChatTaskQuery, type ParsedAdminChatTaskQuery } from './getAdminChatTasksResponse/parseAdminChatTaskQuery';

/**
 * Empty durable-task counters used as the accumulator when summing servers.
 *
 * @private function of `getVpsAdminChatTasksResponse`
 */
const EMPTY_ADMIN_CHAT_TASK_COUNTERS: AdminChatTaskCounters = {
    runningCount: 0,
    queuedCount: 0,
    failedLast24hCount: 0,
    oldestQueuedAgeMs: null,
};

/**
 * Builds the paginated task-manager payload aggregated across **every** server on the VPS.
 *
 * This is the superadmin VPS-wide view. It loads each registered server's durable tasks inside that
 * server's routing context (so per-server isolation is preserved), tags every row with its server,
 * and merges them with the process-local VPS tasks (self-updates, browser previews) that are injected
 * exactly once because they belong to the VPS rather than to any single server.
 *
 * @param searchParams - Task-manager query string shared with the per-server endpoint.
 * @returns Aggregated, paginated VPS-wide task-manager payload.
 *
 * @private internal admin utility of Agents Server
 */
export async function getVpsAdminChatTasksResponse(
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

    const injectableTasks = await loadInjectableAdminChatTasks();
    const injectedTasks = collectAdminChatTasksToInject(injectableTasks, parsedQuery);

    // Note: Every server must return all rows up to the requested page, because the final global order
    //       is only known once all servers and the injected VPS tasks are merged together.
    const perServerQuery = expandAdminChatTaskQueryToPageSpan(parsedQuery);
    const serverRuns = await mapRegisteredServerContexts((server) => loadServerAdminChatTasks(server, perServerQuery));

    const databaseItems: Array<AdminChatTaskRecord> = [];
    let databaseTotal = 0;
    let databaseCounters = EMPTY_ADMIN_CHAT_TASK_COUNTERS;
    for (const serverRun of serverRuns) {
        databaseItems.push(...serverRun.value.items);
        databaseTotal += serverRun.value.total;
        databaseCounters = addAdminChatTaskCounters(databaseCounters, serverRun.value.counters);
    }

    const { items, total } = mergeVpsAdminChatTaskPage({
        databaseItems,
        databaseTotal,
        injectedTasks,
        query: parsedQuery,
    });
    const counters = mergeInjectedAdminChatTaskCounters(databaseCounters, injectableTasks);

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
        } satisfies AdminChatTaskListResponse,
    };
}

/**
 * Loads one server's durable tasks and tags each row with that server.
 *
 * Runs inside the server's routing context established by `mapRegisteredServerContexts`.
 *
 * @param server - Registered server the tasks belong to, or `null` for the ambient context.
 * @param query - Page-spanning query used for every server.
 * @returns Server-tagged durable task data.
 *
 * @private function of `getVpsAdminChatTasksResponse`
 */
async function loadServerAdminChatTasks(
    server: ServerRecord | null,
    query: ParsedAdminChatTaskQuery,
): Promise<GetAdminChatTasksData> {
    const data = await getAdminChatTasks(query);

    return {
        ...data,
        items: data.items.map((task) => ({
            ...task,
            serverName: server?.name ?? null,
            serverDomain: server?.domain ?? null,
        })),
    };
}

/**
 * Merges the injected VPS tasks with the server-tagged database rows and slices the requested page.
 *
 * Unlike the per-server merge, this always sorts and slices because the concatenated per-server rows
 * have no meaningful order until merged.
 *
 * @param options - Merge inputs.
 * @returns Merged items for the current page and the combined total row count.
 *
 * @private function of `getVpsAdminChatTasksResponse`
 */
function mergeVpsAdminChatTaskPage(options: {
    readonly databaseItems: ReadonlyArray<AdminChatTaskRecord>;
    readonly databaseTotal: number;
    readonly injectedTasks: ReadonlyArray<AdminChatTaskRecord>;
    readonly query: ParsedAdminChatTaskQuery;
}): { items: Array<AdminChatTaskRecord>; total: number } {
    const total = options.databaseTotal + options.injectedTasks.length;
    const pageOffset = (options.query.page - 1) * options.query.pageSize;
    const items = [...options.injectedTasks, ...options.databaseItems]
        .sort((leftTask, rightTask) => compareAdminChatTasks(leftTask, rightTask, options.query))
        .slice(pageOffset, pageOffset + options.query.pageSize);

    return { items, total };
}
