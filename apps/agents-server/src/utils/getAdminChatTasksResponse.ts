import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import type { AdminChatTaskCounters, AdminChatTaskListResponse, AdminChatTaskRecord } from './chatTasksAdmin';
import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { mapVpsSelfUpdateJobToAdminChatTask } from './getAdminChatTasksResponse/mapVpsSelfUpdateJobToAdminChatTask';
import { parseAdminChatTaskQuery, type ParsedAdminChatTaskQuery } from './getAdminChatTasksResponse/parseAdminChatTaskQuery';
import { throttledAdminRecovery } from './getAdminChatTasksResponse/throttledAdminRecovery';
import { readVpsSelfUpdateJobSnapshot } from './vpsSelfUpdate';

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

    const adminChatTasks = await getAdminChatTasks(parsedQuery);
    const vpsSelfUpdateTask = await loadVpsSelfUpdateAdminChatTask();
    const injectedTasks = collectAdminChatTasksToInject(vpsSelfUpdateTask, parsedQuery);
    const { items, total } = mergeInjectedAdminChatTasks({
        databaseItems: adminChatTasks.items,
        databaseTotal: adminChatTasks.total,
        injectedTasks,
        page: parsedQuery.page,
        pageSize: parsedQuery.pageSize,
    });
    const counters = mergeInjectedAdminChatTaskCounters(adminChatTasks.counters, vpsSelfUpdateTask);

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
 * Loads the currently persisted standalone VPS self-update task, if any.
 *
 * The read is defensive so a corrupt status file cannot block the admin task manager from rendering.
 *
 * @returns Injectable task record or `null` when no self-update has ever been triggered on this server.
 */
async function loadVpsSelfUpdateAdminChatTask(): Promise<AdminChatTaskRecord | null> {
    try {
        const jobSnapshot = await readVpsSelfUpdateJobSnapshot();
        return mapVpsSelfUpdateJobToAdminChatTask(jobSnapshot);
    } catch (error) {
        console.error('[admin-chat-task] failed to load VPS self-update task snapshot', error);
        return null;
    }
}

/**
 * Filters out injected tasks that do not belong to the requested admin task-manager view or search.
 *
 * @param vpsSelfUpdateTask - Currently persisted self-update task or `null`.
 * @param query - Parsed admin task-manager query.
 * @returns Tasks to inject on top of the database-backed items.
 */
function collectAdminChatTasksToInject(
    vpsSelfUpdateTask: AdminChatTaskRecord | null,
    query: ParsedAdminChatTaskQuery,
): ReadonlyArray<AdminChatTaskRecord> {
    if (!vpsSelfUpdateTask) {
        return [];
    }

    if (!matchesAdminChatTaskView(vpsSelfUpdateTask, query, Date.now())) {
        return [];
    }

    if (!matchesAdminChatTaskSearch(vpsSelfUpdateTask, query.search)) {
        return [];
    }

    return [vpsSelfUpdateTask];
}

/**
 * Prepends the injected task rows to the paginated database items so the self-update stays visible on page 1.
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

    if (options.page !== 1) {
        return { items: [...options.databaseItems], total };
    }

    const items = [...options.injectedTasks, ...options.databaseItems].slice(0, options.pageSize);
    return { items, total };
}

/**
 * Adds the injected self-update task to the summary counters so the header metrics stay accurate.
 *
 * @param databaseCounters - Counters computed from durable database rows.
 * @param vpsSelfUpdateTask - Currently persisted self-update task or `null`.
 * @returns Merged counters including the injected task.
 */
function mergeInjectedAdminChatTaskCounters(
    databaseCounters: AdminChatTaskCounters,
    vpsSelfUpdateTask: AdminChatTaskRecord | null,
): AdminChatTaskCounters {
    if (!vpsSelfUpdateTask) {
        return databaseCounters;
    }

    const nowTimestamp = Date.now();
    const isRunning = vpsSelfUpdateTask.status === 'RUNNING';
    const isFailedInWindow =
        vpsSelfUpdateTask.status === 'FAILED' &&
        isIsoTimestampAtOrAfter(vpsSelfUpdateTask.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS);

    return {
        runningCount: databaseCounters.runningCount + (isRunning ? 1 : 0),
        queuedCount: databaseCounters.queuedCount,
        failedLast24hCount: databaseCounters.failedLast24hCount + (isFailedInWindow ? 1 : 0),
        oldestQueuedAgeMs: databaseCounters.oldestQueuedAgeMs,
    };
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
