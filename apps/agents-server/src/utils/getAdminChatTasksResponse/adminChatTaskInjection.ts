import type { AdminChatTaskCounters, AdminChatTaskRecord } from '../chatTasksAdmin';
import { listPagePreviewBrowserAdminTasks } from '../pagePreviewBrowserSessions';
import { readVpsSelfUpdateJobTaskSnapshots } from '../vpsSelfUpdate';
import { compareAdminChatTasks } from './getAdminChatTasks/compareAdminChatTasks';
import { mapVpsSelfUpdateJobToAdminChatTask } from './mapVpsSelfUpdateJobToAdminChatTask';
import type { ParsedAdminChatTaskQuery } from './parseAdminChatTaskQuery';

/**
 * Milliseconds in one hour.
 *
 * @private internal constant of admin task-manager injection
 */
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * Loads the process-local tasks injected on top of the durable database rows.
 *
 * These tasks (standalone VPS self-updates and live browser previews) live in process
 * memory, not in any server-scoped table, so they belong to the VPS as a whole and are
 * injected exactly once regardless of how many servers are aggregated.
 *
 * The self-update read is defensive so a corrupt status file cannot block the task manager.
 *
 * @returns Injectable task records.
 *
 * @private internal utility of admin task-manager injection
 */
export async function loadInjectableAdminChatTasks(): Promise<Array<AdminChatTaskRecord>> {
    return [...(await loadVpsSelfUpdateAdminChatTasks()), ...listPagePreviewBrowserAdminTasks()];
}

/**
 * Loads persisted standalone VPS self-update tasks, if any.
 *
 * @returns Injectable task records.
 *
 * @private function of `loadInjectableAdminChatTasks`
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
 *
 * @private internal utility of admin task-manager injection
 */
export function collectAdminChatTasksToInject(
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
        .sort((leftTask, rightTask) => compareAdminChatTasks(leftTask, rightTask, query));
}

/**
 * Expands one paginated query so a caller can load every database row up to the requested page.
 *
 * Merging injected or multi-server rows requires all database rows from the first row through the
 * end of the requested page, because their final order is only known after the merge.
 *
 * @param query - Parsed admin task-manager query.
 * @returns Query loading enough rows from page one to cover the requested page after merging.
 *
 * @private internal utility of admin task-manager injection
 */
export function expandAdminChatTaskQueryToPageSpan(query: ParsedAdminChatTaskQuery): ParsedAdminChatTaskQuery {
    const pageOffset = (query.page - 1) * query.pageSize;
    const databaseEndOffset = Math.max(0, pageOffset + query.pageSize);

    return {
        ...query,
        page: 1,
        pageSize: Math.max(1, databaseEndOffset),
    };
}

/**
 * Builds the database query needed to merge injected task rows into the requested page.
 *
 * @param query - Parsed admin task-manager query.
 * @param injectedTaskCount - Number of injected rows that appear before database-backed rows.
 * @returns Query used for loading enough database-backed rows to fill the final page.
 *
 * @private internal utility of admin task-manager injection
 */
export function createInjectedAwareAdminChatTaskQuery(
    query: ParsedAdminChatTaskQuery,
    injectedTaskCount: number,
): ParsedAdminChatTaskQuery {
    if (injectedTaskCount === 0) {
        return query;
    }

    return expandAdminChatTaskQueryToPageSpan(query);
}

/**
 * Prepends injected task rows to the database-backed items and returns the requested combined page.
 *
 * @param options - Merge inputs.
 * @returns Merged items for the current page and the updated total row count.
 *
 * @private internal utility of admin task-manager injection
 */
export function mergeInjectedAdminChatTasks(options: {
    readonly databaseItems: ReadonlyArray<AdminChatTaskRecord>;
    readonly databaseTotal: number;
    readonly injectedTasks: ReadonlyArray<AdminChatTaskRecord>;
    readonly page: number;
    readonly pageSize: number;
    readonly query: ParsedAdminChatTaskQuery;
}): { items: Array<AdminChatTaskRecord>; total: number } {
    const total = options.databaseTotal + options.injectedTasks.length;
    if (options.injectedTasks.length === 0) {
        return { items: [...options.databaseItems], total };
    }

    const pageOffset = (options.page - 1) * options.pageSize;
    const items = [...options.injectedTasks, ...options.databaseItems]
        .sort((leftTask, rightTask) => compareAdminChatTasks(leftTask, rightTask, options.query))
        .slice(pageOffset, pageOffset + options.pageSize);

    return { items, total };
}

/**
 * Adds injected tasks to the summary counters so the header metrics stay accurate.
 *
 * @param databaseCounters - Counters computed from durable database rows.
 * @param injectedTasks - Synthetic task rows collected from process-local state.
 * @returns Merged counters including the injected tasks.
 *
 * @private internal utility of admin task-manager injection
 */
export function mergeInjectedAdminChatTaskCounters(
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
 * Sums two durable-task summary counter sets, used when aggregating multiple servers on the VPS.
 *
 * @param leftCounters - First counter set.
 * @param rightCounters - Second counter set.
 * @returns Combined counters.
 *
 * @private internal utility of admin task-manager injection
 */
export function addAdminChatTaskCounters(
    leftCounters: AdminChatTaskCounters,
    rightCounters: AdminChatTaskCounters,
): AdminChatTaskCounters {
    return {
        runningCount: leftCounters.runningCount + rightCounters.runningCount,
        queuedCount: leftCounters.queuedCount + rightCounters.queuedCount,
        failedLast24hCount: leftCounters.failedLast24hCount + rightCounters.failedLast24hCount,
        oldestQueuedAgeMs: mergeOldestQueuedAge(leftCounters.oldestQueuedAgeMs, rightCounters.oldestQueuedAgeMs),
    };
}

/**
 * Merges two oldest-queued-task ages, keeping the older (larger) age.
 *
 * @param leftOldestQueuedAgeMs - First oldest queued-task age.
 * @param rightOldestQueuedAgeMs - Second oldest queued-task age.
 * @returns Oldest queued age across both sources.
 *
 * @private function of admin task-manager injection
 */
function mergeOldestQueuedAge(
    leftOldestQueuedAgeMs: number | null,
    rightOldestQueuedAgeMs: number | null,
): number | null {
    if (leftOldestQueuedAgeMs === null) {
        return rightOldestQueuedAgeMs;
    }

    if (rightOldestQueuedAgeMs === null) {
        return leftOldestQueuedAgeMs;
    }

    return Math.max(leftOldestQueuedAgeMs, rightOldestQueuedAgeMs);
}

/**
 * Returns whether the injected task belongs in the requested admin task-manager view.
 *
 * @param task - Injected task.
 * @param query - Parsed admin task-manager query.
 * @param nowTimestamp - Current epoch used for time-window filtering.
 * @returns `true` when the task should be included.
 *
 * @private function of admin task-manager injection
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
 *
 * @private function of admin task-manager injection
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
 *
 * @private function of admin task-manager injection
 */
function isIsoTimestampAtOrAfter(timestampIso: string | null, cutoffTimestamp: number): boolean {
    if (!timestampIso) {
        return false;
    }

    const timestamp = Date.parse(timestampIso);
    return Number.isFinite(timestamp) && timestamp >= cutoffTimestamp;
}
