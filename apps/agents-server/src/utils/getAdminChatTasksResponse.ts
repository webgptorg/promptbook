import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import type { AdminChatTaskCounters, AdminChatTaskListResponse, AdminChatTaskRecord } from './chatTasksAdmin';
import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { compareAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks';
import { mapVpsSelfUpdateJobToAdminChatTask } from './getAdminChatTasksResponse/mapVpsSelfUpdateJobToAdminChatTask';
import { parseAdminChatTaskQuery, type ParsedAdminChatTaskQuery } from './getAdminChatTasksResponse/parseAdminChatTaskQuery';
import { throttledAdminRecovery } from './getAdminChatTasksResponse/throttledAdminRecovery';
import { listPagePreviewBrowserAdminTasks } from './pagePreviewBrowserSessions';
import { readVpsSelfUpdateJobTaskSnapshots } from './vpsSelfUpdate';

/**
 * Milliseconds in one hour.
 *
 * @private internal constant of `getAdminChatTasksResponse`
 */
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

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

    const vpsSelfUpdateTasks = await loadVpsSelfUpdateAdminChatTasks();
    const pagePreviewBrowserTasks = listPagePreviewBrowserAdminTasks();
    const injectableTasks = [...vpsSelfUpdateTasks, ...pagePreviewBrowserTasks];
    const injectedTasks = collectAdminChatTasksToInject(injectableTasks, parsedQuery);
    const databaseQuery = createInjectedAwareAdminChatTaskQuery(parsedQuery, injectedTasks.length);
    const adminChatTasks = await getAdminChatTasks(databaseQuery);
    const { items, total } = mergeInjectedAdminChatTasks({
        databaseItems: adminChatTasks.items,
        databaseTotal: adminChatTasks.total,
        injectedTasks,
        page: parsedQuery.page,
        pageSize: parsedQuery.pageSize,
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
            timeWindowHours: parsedQuery.timeWindowHours,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Loads persisted standalone VPS self-update tasks, if any.
 *
 * The read is defensive so a corrupt status file cannot block the admin task manager from rendering.
 *
 * @returns Injectable task records.
 */
async function loadVpsSelfUpdateAdminChatTasks(): Promise<Array<AdminChatTaskRecord>> {
    try {
        const jobSnapshots = await readVpsSelfUpdateJobTaskSnapshots();
        return jobSnapshots
            .map(mapVpsSelfUpdateJobToAdminChatTask)
            .filter((task): task is AdminChatTaskRecord => task !== null);
    } catch (error) {
        console.error('[admin-chat-task] failed to load VPS self-update task snapshots', error);
        return [];
    }
}

/**
 * Filters out injected tasks that do not belong to the requested admin task-manager view or search.
 *
 * @param injectableTasks - Synthetic task rows collected from process-local state.
 * @param query - Parsed admin task-manager query.
 * @returns Tasks to inject on top of the database-backed items.
 */
function collectAdminChatTasksToInject(
    injectableTasks: ReadonlyArray<AdminChatTaskRecord>,
    query: ParsedAdminChatTaskQuery,
): ReadonlyArray<AdminChatTaskRecord> {
    const nowTimestamp = Date.now();
    return injectableTasks
        .filter(
            (task) =>
                matchesAdminChatTaskView(task, query, nowTimestamp) &&
                matchesAdminChatTaskSearch(task, query.search),
        )
        .sort((leftTask, rightTask) => compareAdminChatTasks(leftTask, rightTask, query.view));
}

/**
 * Builds the database query needed to merge injected task rows into the requested page.
 *
 * @param query - Parsed admin task-manager query.
 * @param injectedTaskCount - Number of injected rows that appear before database-backed rows.
 * @returns Query used for loading enough database-backed rows to fill the final page.
 */
function createInjectedAwareAdminChatTaskQuery(
    query: ParsedAdminChatTaskQuery,
    injectedTaskCount: number,
): ParsedAdminChatTaskQuery {
    if (injectedTaskCount === 0) {
        return query;
    }

    const pageOffset = (query.page - 1) * query.pageSize;
    const databaseEndOffset = Math.max(0, pageOffset + query.pageSize - injectedTaskCount);

    return {
        ...query,
        page: 1,
        pageSize: Math.max(1, databaseEndOffset),
    };
}

/**
 * Prepends injected task rows to the database-backed items and returns the requested combined page.
 *
 * @param options - Merge inputs.
 * @returns Merged items for the current page and the updated total row count.
 */
function mergeInjectedAdminChatTasks(options: {
    readonly databaseItems: ReadonlyArray<AdminChatTaskRecord>;
    readonly databaseTotal: number;
    readonly injectedTasks: ReadonlyArray<AdminChatTaskRecord>;
    readonly page: number;
    readonly pageSize: number;
}): { items: Array<AdminChatTaskRecord>; total: number } {
    const total = options.databaseTotal + options.injectedTasks.length;
    if (options.injectedTasks.length === 0) {
        return { items: [...options.databaseItems], total };
    }

    const pageOffset = (options.page - 1) * options.pageSize;
    const injectedItems = options.injectedTasks.slice(pageOffset, pageOffset + options.pageSize);
    const remainingPageSize = options.pageSize - injectedItems.length;

    if (remainingPageSize <= 0) {
        return { items: [...injectedItems], total };
    }

    const databaseOffset = Math.max(0, pageOffset - options.injectedTasks.length);
    const databaseItems = options.databaseItems.slice(databaseOffset, databaseOffset + remainingPageSize);
    const items = [...injectedItems, ...databaseItems];
    return { items, total };
}

/**
 * Adds injected tasks to the summary counters so the header metrics stay accurate.
 *
 * @param databaseCounters - Counters computed from durable database rows.
 * @param injectedTasks - Synthetic task rows collected from process-local state.
 * @returns Merged counters including the injected tasks.
 */
function mergeInjectedAdminChatTaskCounters(
    databaseCounters: AdminChatTaskCounters,
    injectedTasks: ReadonlyArray<AdminChatTaskRecord>,
): AdminChatTaskCounters {
    if (injectedTasks.length === 0) {
        return databaseCounters;
    }

    const nowTimestamp = Date.now();
    const injectedQueuedTimestamps = injectedTasks
        .filter((task) => task.status === 'QUEUED')
        .map((task) => Date.parse(task.queuedAt))
        .filter((timestamp) => Number.isFinite(timestamp));
    const oldestInjectedQueuedAgeMs =
        injectedQueuedTimestamps.length === 0 ? null : nowTimestamp - Math.min(...injectedQueuedTimestamps);

    return {
        runningCount: databaseCounters.runningCount + injectedTasks.filter((task) => task.status === 'RUNNING').length,
        queuedCount: databaseCounters.queuedCount + injectedTasks.filter((task) => task.status === 'QUEUED').length,
        failedLast24hCount:
            databaseCounters.failedLast24hCount +
            injectedTasks.filter(
                (task) =>
                    task.status === 'FAILED' &&
                    isIsoTimestampAtOrAfter(task.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS),
            ).length,
        oldestQueuedAgeMs: mergeOldestQueuedAge(databaseCounters.oldestQueuedAgeMs, oldestInjectedQueuedAgeMs),
    };
}

/**
 * Merges durable and injected queued-task ages.
 *
 * @param databaseOldestQueuedAgeMs - Oldest durable queued-task age.
 * @param injectedOldestQueuedAgeMs - Oldest injected queued-task age.
 * @returns Oldest queued age across both sources.
 */
function mergeOldestQueuedAge(
    databaseOldestQueuedAgeMs: number | null,
    injectedOldestQueuedAgeMs: number | null,
): number | null {
    if (databaseOldestQueuedAgeMs === null) {
        return injectedOldestQueuedAgeMs;
    }

    if (injectedOldestQueuedAgeMs === null) {
        return databaseOldestQueuedAgeMs;
    }

    return Math.max(databaseOldestQueuedAgeMs, injectedOldestQueuedAgeMs);
}

/**
 * Returns whether the injected task belongs in the requested admin task-manager view.
 *
 * @param task - Injected task.
 * @param query - Parsed admin task-manager query.
 * @param nowTimestamp - Current epoch used for time-window filtering.
 * @returns `true` when the task should be included.
 */
function matchesAdminChatTaskView(
    task: AdminChatTaskRecord,
    query: ParsedAdminChatTaskQuery,
    nowTimestamp: number,
): boolean {
    switch (query.view) {
        case 'running':
            return task.status === 'RUNNING';
        case 'queued':
            return task.status === 'QUEUED';
        case 'failed':
            return (
                task.status === 'FAILED' &&
                isIsoTimestampAtOrAfter(task.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS)
            );
        case 'all':
            return isIsoTimestampAtOrAfter(task.updatedAt, nowTimestamp - query.timeWindowHours * HOUR_IN_MILLISECONDS);
        case 'active':
        default:
            return task.status === 'QUEUED' || task.status === 'RUNNING';
    }
}

/**
 * Returns whether the injected task matches the free-text admin search input.
 *
 * @param task - Injected task.
 * @param search - Trimmed search text from the parsed query.
 * @returns `true` when the task should be included.
 */
function matchesAdminChatTaskSearch(task: AdminChatTaskRecord, search: string): boolean {
    if (!search) {
        return true;
    }

    const normalizedSearch = search.toLowerCase();
    if (task.id.toLowerCase().includes(normalizedSearch)) {
        return true;
    }
    if (task.agentPermanentId.toLowerCase().includes(normalizedSearch)) {
        return true;
    }
    if ((task.agentName || '').toLowerCase().includes(normalizedSearch)) {
        return true;
    }
    return task.chatId.toLowerCase().includes(normalizedSearch);
}

/**
 * Returns whether one ISO timestamp is at or after the given cutoff.
 *
 * @param timestampIso - Optional ISO timestamp.
 * @param cutoffTimestamp - Epoch cutoff in milliseconds.
 * @returns `true` when the timestamp is at or after the cutoff.
 */
function isIsoTimestampAtOrAfter(timestampIso: string | null, cutoffTimestamp: number): boolean {
    if (!timestampIso) {
        return false;
    }

    const timestamp = Date.parse(timestampIso);
    return Number.isFinite(timestamp) && timestamp >= cutoffTimestamp;
}
