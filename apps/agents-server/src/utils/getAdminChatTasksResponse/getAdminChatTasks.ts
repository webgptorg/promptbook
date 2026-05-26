import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import type { AgentsServerDatabase } from '@/src/database/schema';
import type { AdminChatTaskCounters, AdminChatTaskRecord, AdminChatTaskView } from '../chatTasksAdmin';
import { provideUserChatJobTable } from '../userChat/provideUserChatJobTable';
import type { UserChatJobStatus } from '../userChat/UserChatJobRecord';
import { provideUserChatTimeoutTable } from '../userChatTimeout/userChatTimeoutStore/provideUserChatTimeoutTable';
import type { ParsedAdminChatTaskQuery } from './parseAdminChatTaskQuery';

/**
 * Milliseconds in one hour.
 *
 * @private internal constant of `getAdminChatTasksResponse`
 */
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * Raw SQL row returned by the paginated admin task query.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskSqlRow = {
    id: string;
    kind: 'CHAT_COMPLETION' | 'CHAT_TIMEOUT';
    status: UserChatJobStatus;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    finishedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    recurrenceIntervalMs: string | number | null;
    attemptCount: number;
    lastErrorSummary: string | null;
    lastErrorDetails: string | null;
    userId: number;
    username: string | null;
    agentPermanentId: string;
    agentName: string | null;
    chatId: string;
    totalCount: string | number;
};

/**
 * Raw SQL row returned by the task-manager counters query.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskCountersSqlRow = {
    runningCount: string | number;
    queuedCount: string | number;
    failedLast24hCount: string | number;
    oldestQueuedAgeMs: string | number | null;
};

/**
 * SQLite-backed job row used by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskJobRow = {
    id: string;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    failureReason: string | null;
    failureDetails?: string | null;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    status: UserChatJobStatus;
};

/**
 * SQLite-backed timeout row used by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskTimeoutRow = {
    id: string;
    createdAt: string;
    queuedAt: string;
    startedAt: string | null;
    updatedAt: string;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    leaseExpiresAt: string | null;
    recurrenceIntervalMs: number | string | null;
    attemptCount: number;
    failureReason: string | null;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    status: UserChatJobStatus;
};

/**
 * Minimal user lookup row needed by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskUserLookupRow = Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'id' | 'username'>;

/**
 * Minimal agent lookup row needed by the admin task-manager fallback.
 *
 * @private type of `getAdminChatTasksResponse`
 */
type AdminChatTaskAgentLookupRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'permanentId' | 'agentName'
>;

/**
 * Loaded admin chat-task data before the final response envelope is assembled.
 *
 * @private type of `getAdminChatTasksResponse`
 */
export type GetAdminChatTasksData = {
    items: Array<AdminChatTaskRecord>;
    counters: AdminChatTaskCounters;
    total: number;
};

/**
 * Loads the admin task-manager data from durable chat job and timeout tables.
 *
 * @private function of `getAdminChatTasksResponse`
 */
export async function getAdminChatTasks(query: ParsedAdminChatTaskQuery): Promise<GetAdminChatTasksData> {
    if (isAgentsServerSqliteMode()) {
        return getAdminChatTasksViaSupabaseQuery(query);
    }

    return getAdminChatTasksViaClientSql(query);
}

/**
 * Loads admin task-manager data through the shared Supabase-shaped adapters used by SQLite mode.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function getAdminChatTasksViaSupabaseQuery(query: ParsedAdminChatTaskQuery): Promise<GetAdminChatTasksData> {
    const [jobRows, timeoutRows] = await Promise.all([loadAdminChatTaskJobRows(), loadAdminChatTaskTimeoutRows()]);
    const allUserIds = [...new Set([...jobRows, ...timeoutRows].map((task) => task.userId))];
    const allAgentPermanentIds = [
        ...new Set([...jobRows, ...timeoutRows].map((task) => task.agentPermanentId).filter(Boolean)),
    ];
    const [usernamesById, agentNamesByPermanentId] = await Promise.all([
        loadAdminChatTaskUsernames(allUserIds),
        loadAdminChatTaskAgentNames(allAgentPermanentIds),
    ]);
    const allTasks = [
        ...jobRows.map((row) => mapAdminChatTaskJobRow(row, usernamesById, agentNamesByPermanentId)),
        ...timeoutRows.map((row) => mapAdminChatTaskTimeoutRow(row, usernamesById, agentNamesByPermanentId)),
    ];
    const nowTimestamp = Date.now();
    const filteredTasks = allTasks
        .filter((task) => matchesAdminChatTaskView(task, query, nowTimestamp))
        .filter((task) => matchesAdminChatTaskSearch(task, query.search))
        .sort((leftTask, rightTask) => compareAdminChatTasks(leftTask, rightTask, query.view));
    const pageOffset = (query.page - 1) * query.pageSize;

    return {
        items: filteredTasks.slice(pageOffset, pageOffset + query.pageSize),
        counters: createAdminChatTaskCounters(allTasks, nowTimestamp),
        total: filteredTasks.length,
    };
}

/**
 * Loads admin task-manager data through the existing PostgreSQL raw SQL path.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function getAdminChatTasksViaClientSql(query: ParsedAdminChatTaskQuery): Promise<GetAdminChatTasksData> {
    const sql = await $provideClientSql();
    const userChatJobTable = quoteIdentifier(await $getTableName('UserChatJob'));
    const userChatTimeoutTable = quoteIdentifier(await resolvePrefixedTableName('UserChatTimeout'));
    const userTable = quoteIdentifier(await $getTableName('User'));
    const agentTable = quoteIdentifier(await $getTableName('Agent'));
    const baseTaskQuery = createAdminChatTaskBaseQuery({
        userChatJobTable,
        userChatTimeoutTable,
        userTable,
        agentTable,
    });
    const listQueryParts = createAdminChatTaskListQueryParts(query);
    const listRows = await sql.raw<Array<AdminChatTaskSqlRow>>(
        `
            WITH tasks AS (
                ${baseTaskQuery}
            )
            SELECT
                task.*,
                COUNT(*) OVER() AS "totalCount"
            FROM tasks task
            ${listQueryParts.whereClause}
            ORDER BY ${createAdminChatTaskOrderBySql(query.view, 'task')}
            LIMIT $${listQueryParts.limitPlaceholder}
            OFFSET $${listQueryParts.offsetPlaceholder}
        `,
        listQueryParts.values,
    );
    const counterRows = await sql.raw<Array<AdminChatTaskCountersSqlRow>>(
        `
            WITH tasks AS (
                ${baseTaskQuery}
            )
            SELECT
                COUNT(*) FILTER (WHERE "status" = 'RUNNING') AS "runningCount",
                COUNT(*) FILTER (WHERE "status" = 'QUEUED') AS "queuedCount",
                COUNT(*) FILTER (
                    WHERE "status" = 'FAILED'
                      AND "finishedAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                ) AS "failedLast24hCount",
                CASE
                    WHEN MIN("queuedAt") FILTER (WHERE "status" = 'QUEUED') IS NULL THEN NULL
                    ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MIN("queuedAt") FILTER (WHERE "status" = 'QUEUED'))) * 1000
                END AS "oldestQueuedAgeMs"
            FROM tasks
        `,
    );

    return {
        items: listRows.map(mapAdminChatTaskSqlRow),
        counters: mapAdminChatTaskCounters(counterRows[0]),
        total: resolveSqlCount(listRows[0]?.totalCount),
    };
}

/**
 * Loads lightweight durable chat-job rows for SQLite mode.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function loadAdminChatTaskJobRows(): Promise<Array<AdminChatTaskJobRow>> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable.select(
        'id,createdAt,queuedAt,startedAt,updatedAt,completedAt,cancelRequestedAt,lastHeartbeatAt,leaseExpiresAt,attemptCount,failureReason,failureDetails,userId,agentPermanentId,chatId,status',
    );

    if (error) {
        throw new Error(`Failed to list admin user chat jobs: ${error.message}`);
    }

    return (data || []) as unknown as Array<AdminChatTaskJobRow>;
}

/**
 * Loads lightweight durable timeout rows for SQLite mode.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function loadAdminChatTaskTimeoutRows(): Promise<Array<AdminChatTaskTimeoutRow>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable.select(
        'id,createdAt,queuedAt,startedAt,updatedAt,completedAt,cancelRequestedAt,pausedAt,leaseExpiresAt,recurrenceIntervalMs,attemptCount,failureReason,userId,agentPermanentId,chatId,status',
    );

    if (error) {
        throw new Error(`Failed to list admin user chat timeouts: ${error.message}`);
    }

    return (data || []) as unknown as Array<AdminChatTaskTimeoutRow>;
}

/**
 * Loads usernames keyed by user id for admin task rendering and search.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function loadAdminChatTaskUsernames(userIds: ReadonlyArray<number>): Promise<Map<number, string>> {
    if (userIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const { data, error } = await supabase.from(userTable).select('id,username').in('id', [...new Set(userIds)]);

    if (error) {
        throw new Error(`Failed to load admin task-manager users: ${error.message}`);
    }

    return new Map(
        ((data || []) as Array<AdminChatTaskUserLookupRow>).map((userRow) => [userRow.id, userRow.username] as const),
    );
}

/**
 * Loads agent names keyed by permanent id for admin task rendering and search.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function loadAdminChatTaskAgentNames(
    agentPermanentIds: ReadonlyArray<string>,
): Promise<Map<string, string | null>> {
    if (agentPermanentIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTable)
        .select('permanentId,agentName')
        .in('permanentId', [...new Set(agentPermanentIds)]);

    if (error) {
        throw new Error(`Failed to load admin task-manager agents: ${error.message}`);
    }

    return new Map(
        ((data || []) as Array<AdminChatTaskAgentLookupRow>)
            .filter((agentRow): agentRow is AdminChatTaskAgentLookupRow & { permanentId: string } => Boolean(agentRow.permanentId))
            .map((agentRow) => [agentRow.permanentId, agentRow.agentName] as const),
    );
}

/**
 * Maps one SQLite-backed chat job into the public admin task row shape.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function mapAdminChatTaskJobRow(
    row: AdminChatTaskJobRow,
    usernamesById: ReadonlyMap<number, string>,
    agentNamesByPermanentId: ReadonlyMap<string, string | null>,
): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: 'CHAT_COMPLETION',
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: null,
        lastHeartbeatAt: row.lastHeartbeatAt,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.failureReason,
        lastErrorDetails: row.failureDetails ?? null,
        userId: row.userId,
        username: usernamesById.get(row.userId) ?? null,
        agentPermanentId: row.agentPermanentId,
        agentName: agentNamesByPermanentId.get(row.agentPermanentId) ?? null,
        chatId: row.chatId,
        workerId: null,
        queueName: 'user-chat-jobs',
    };
}

/**
 * Maps one SQLite-backed timeout into the public admin task row shape.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function mapAdminChatTaskTimeoutRow(
    row: AdminChatTaskTimeoutRow,
    usernamesById: ReadonlyMap<number, string>,
    agentNamesByPermanentId: ReadonlyMap<string, string | null>,
): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: 'CHAT_TIMEOUT',
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt,
        lastHeartbeatAt: null,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: resolveNullableSqlNumber(row.recurrenceIntervalMs),
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.failureReason,
        lastErrorDetails: null,
        userId: row.userId,
        username: usernamesById.get(row.userId) ?? null,
        agentPermanentId: row.agentPermanentId,
        agentName: agentNamesByPermanentId.get(row.agentPermanentId) ?? null,
        chatId: row.chatId,
        workerId: null,
        queueName: 'user-chat-timeouts',
    };
}

/**
 * Returns whether one task belongs in the requested admin task-manager view.
 *
 * @private function of `getAdminChatTasksResponse`
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
 * Returns whether one task matches the free-text admin search input.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function matchesAdminChatTaskSearch(task: AdminChatTaskRecord, search: string): boolean {
    if (!search) {
        return true;
    }

    if (
        task.id === search ||
        task.id.startsWith(search) ||
        task.chatId === search ||
        task.chatId.startsWith(search) ||
        task.agentPermanentId === search ||
        task.agentPermanentId.startsWith(search)
    ) {
        return true;
    }

    const normalizedSearch = search.toLowerCase();
    if ((task.agentName || '').toLowerCase().includes(normalizedSearch)) {
        return true;
    }
    if ((task.username || '').toLowerCase().includes(normalizedSearch)) {
        return true;
    }

    return /^\d+$/.test(search) && task.userId === Number.parseInt(search, 10);
}

/**
 * Calculates the summary counters rendered above the admin task table.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function createAdminChatTaskCounters(
    tasks: ReadonlyArray<AdminChatTaskRecord>,
    nowTimestamp: number,
): AdminChatTaskCounters {
    const queuedTimestamps = tasks
        .filter((task) => task.status === 'QUEUED')
        .map((task) => parseIsoTimestamp(task.queuedAt))
        .filter((timestamp): timestamp is number => timestamp !== null);
    const oldestQueuedTimestamp =
        queuedTimestamps.length > 0 ? Math.min(...queuedTimestamps) : null;

    return {
        runningCount: tasks.filter((task) => task.status === 'RUNNING').length,
        queuedCount: tasks.filter((task) => task.status === 'QUEUED').length,
        failedLast24hCount: tasks.filter(
            (task) =>
                task.status === 'FAILED' &&
                isIsoTimestampAtOrAfter(task.finishedAt, nowTimestamp - 24 * HOUR_IN_MILLISECONDS),
        ).length,
        oldestQueuedAgeMs: oldestQueuedTimestamp === null ? null : Math.max(0, nowTimestamp - oldestQueuedTimestamp),
    };
}

/**
 * Compares two tasks using the same ordering semantics as the PostgreSQL dashboard query.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareAdminChatTasks(
    leftTask: AdminChatTaskRecord,
    rightTask: AdminChatTaskRecord,
    view: AdminChatTaskView,
): number {
    switch (view) {
        case 'running':
            return (
                compareNullableIsoTimestampsDescending(leftTask.startedAt, rightTask.startedAt) ||
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'queued':
            return (
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'failed':
            return (
                compareNullableIsoTimestampsDescending(leftTask.finishedAt, rightTask.finishedAt) ||
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'all':
            return (
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareIsoTimestampsDescending(leftTask.createdAt, rightTask.createdAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
        case 'active':
        default:
            return (
                compareNumbersAscending(
                    resolveAdminChatTaskActiveStatusRank(leftTask.status),
                    resolveAdminChatTaskActiveStatusRank(rightTask.status),
                ) ||
                compareNullableIsoTimestampsDescending(
                    leftTask.status === 'RUNNING' ? leftTask.startedAt : null,
                    rightTask.status === 'RUNNING' ? rightTask.startedAt : null,
                ) ||
                compareNullableIsoTimestampsDescending(
                    leftTask.status === 'QUEUED' ? leftTask.createdAt : null,
                    rightTask.status === 'QUEUED' ? rightTask.createdAt : null,
                ) ||
                compareIsoTimestampsDescending(leftTask.updatedAt, rightTask.updatedAt) ||
                compareStringsDescending(leftTask.id, rightTask.id)
            );
    }
}

/**
 * Resolves the status sort bucket used by the `Active` dashboard view.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function resolveAdminChatTaskActiveStatusRank(status: UserChatJobStatus): number {
    switch (status) {
        case 'RUNNING':
            return 0;
        case 'QUEUED':
            return 1;
        default:
            return 2;
    }
}

/**
 * Returns whether one ISO timestamp is at or after the given cutoff.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function isIsoTimestampAtOrAfter(timestampIso: string | null, cutoffTimestamp: number): boolean {
    const timestamp = parseIsoTimestamp(timestampIso);
    return timestamp !== null && timestamp >= cutoffTimestamp;
}

/**
 * Parses one ISO timestamp into milliseconds since epoch.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function parseIsoTimestamp(timestampIso: string | null): number | null {
    if (!timestampIso) {
        return null;
    }

    const timestamp = Date.parse(timestampIso);
    return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Sorts timestamps descending while keeping `null` values last.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareNullableIsoTimestampsDescending(leftTimestampIso: string | null, rightTimestampIso: string | null): number {
    const leftTimestamp = parseIsoTimestamp(leftTimestampIso);
    const rightTimestamp = parseIsoTimestamp(rightTimestampIso);

    if (leftTimestamp === rightTimestamp) {
        return 0;
    }
    if (leftTimestamp === null) {
        return 1;
    }
    if (rightTimestamp === null) {
        return -1;
    }

    return compareNumbersDescending(leftTimestamp, rightTimestamp);
}

/**
 * Sorts required timestamps descending.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareIsoTimestampsDescending(leftTimestampIso: string, rightTimestampIso: string): number {
    return compareNullableIsoTimestampsDescending(leftTimestampIso, rightTimestampIso);
}

/**
 * Sorts numbers ascending.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareNumbersAscending(leftNumber: number, rightNumber: number): number {
    return leftNumber - rightNumber;
}

/**
 * Sorts numbers descending.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareNumbersDescending(leftNumber: number, rightNumber: number): number {
    return rightNumber - leftNumber;
}

/**
 * Sorts strings descending.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function compareStringsDescending(leftString: string, rightString: string): number {
    return leftString === rightString ? 0 : leftString < rightString ? 1 : -1;
}

/**
 * Creates the `WHERE` clause and parameter list for the paginated admin task query.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function createAdminChatTaskListQueryParts(query: ParsedAdminChatTaskQuery): {
    whereClause: string;
    values: Array<string | number>;
    limitPlaceholder: number;
    offsetPlaceholder: number;
} {
    const values: Array<string | number> = [];
    const whereParts: Array<string> = [];

    appendAdminChatTaskViewClause(query, values, whereParts, 'task');
    appendAdminChatTaskSearchClause(query.search, values, whereParts, 'task');

    values.push(query.pageSize);
    values.push((query.page - 1) * query.pageSize);

    return {
        whereClause: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
        values,
        limitPlaceholder: values.length - 1,
        offsetPlaceholder: values.length,
    };
}

/**
 * Appends the status/time-window filter for one dashboard view.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function appendAdminChatTaskViewClause(
    query: ParsedAdminChatTaskQuery,
    values: Array<string | number>,
    whereParts: Array<string>,
    alias: string,
): void {
    switch (query.view) {
        case 'running':
            whereParts.push(`${alias}."status" = 'RUNNING'`);
            return;
        case 'queued':
            whereParts.push(`${alias}."status" = 'QUEUED'`);
            return;
        case 'failed':
            whereParts.push(`${alias}."status" = 'FAILED'`);
            whereParts.push(`${alias}."finishedAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`);
            return;
        case 'all':
            values.push(query.timeWindowHours);
            whereParts.push(`${alias}."updatedAt" >= CURRENT_TIMESTAMP - ($${values.length} * INTERVAL '1 hour')`);
            return;
        case 'active':
        default:
            whereParts.push(`${alias}."status" IN ('QUEUED', 'RUNNING')`);
    }
}

/**
 * Appends the free-text search clause used by the dashboard.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function appendAdminChatTaskSearchClause(
    search: string,
    values: Array<string | number>,
    whereParts: Array<string>,
    alias: string,
): void {
    if (!search) {
        return;
    }

    values.push(search);
    const exactPlaceholder = values.length;

    values.push(`${search}%`);
    const prefixPlaceholder = values.length;

    values.push(`%${search}%`);
    const containsPlaceholder = values.length;

    const searchParts = [
        `${alias}."id" = $${exactPlaceholder}`,
        `${alias}."id" LIKE $${prefixPlaceholder}`,
        `${alias}."chatId" = $${exactPlaceholder}`,
        `${alias}."chatId" LIKE $${prefixPlaceholder}`,
        `${alias}."agentPermanentId" = $${exactPlaceholder}`,
        `${alias}."agentPermanentId" LIKE $${prefixPlaceholder}`,
        `COALESCE(${alias}."agentName", '') ILIKE $${containsPlaceholder}`,
        `COALESCE(${alias}."username", '') ILIKE $${containsPlaceholder}`,
    ];

    if (/^\d+$/.test(search)) {
        values.push(Number.parseInt(search, 10));
        searchParts.push(`${alias}."userId" = $${values.length}`);
    }

    whereParts.push(`(${searchParts.join(' OR ')})`);
}

/**
 * Resolves the stable sort order used by each dashboard view.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function createAdminChatTaskOrderBySql(view: AdminChatTaskView, alias: string): string {
    switch (view) {
        case 'running':
            return `${alias}."startedAt" DESC NULLS LAST, ${alias}."createdAt" DESC, ${alias}."id" DESC`;
        case 'queued':
            return `${alias}."createdAt" DESC, ${alias}."id" DESC`;
        case 'failed':
            return `${alias}."finishedAt" DESC NULLS LAST, ${alias}."updatedAt" DESC, ${alias}."id" DESC`;
        case 'all':
            return `${alias}."updatedAt" DESC, ${alias}."createdAt" DESC, ${alias}."id" DESC`;
        case 'active':
        default:
            return `
                CASE
                    WHEN ${alias}."status" = 'RUNNING' THEN 0
                    WHEN ${alias}."status" = 'QUEUED' THEN 1
                    ELSE 2
                END ASC,
                CASE
                    WHEN ${alias}."status" = 'RUNNING' THEN ${alias}."startedAt"
                    ELSE NULL
                END DESC NULLS LAST,
                CASE
                    WHEN ${alias}."status" = 'QUEUED' THEN ${alias}."createdAt"
                    ELSE NULL
                END DESC NULLS LAST,
                ${alias}."updatedAt" DESC,
                ${alias}."id" DESC
            `;
    }
}

/**
 * Maps one SQL row into the public admin task-manager row shape.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function mapAdminChatTaskSqlRow(row: AdminChatTaskSqlRow): AdminChatTaskRecord {
    return {
        id: row.id,
        kind: row.kind,
        status: row.status,
        createdAt: row.createdAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        finishedAt: row.finishedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt,
        lastHeartbeatAt: row.lastHeartbeatAt,
        leaseExpiresAt: row.leaseExpiresAt,
        recurrenceIntervalMs: resolveNullableSqlNumber(row.recurrenceIntervalMs),
        priority: null,
        attemptCount: row.attemptCount,
        retryCount: Math.max(0, row.attemptCount - 1),
        lastErrorSummary: row.lastErrorSummary,
        lastErrorDetails: row.lastErrorDetails,
        userId: row.userId,
        username: row.username,
        agentPermanentId: row.agentPermanentId,
        agentName: row.agentName,
        chatId: row.chatId,
        workerId: null,
        queueName: row.kind === 'CHAT_TIMEOUT' ? 'user-chat-timeouts' : 'user-chat-jobs',
    };
}

/**
 * Maps the aggregate counters SQL row into the API response shape.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function mapAdminChatTaskCounters(row: AdminChatTaskCountersSqlRow | undefined): AdminChatTaskCounters {
    return {
        runningCount: resolveSqlCount(row?.runningCount),
        queuedCount: resolveSqlCount(row?.queuedCount),
        failedLast24hCount: resolveSqlCount(row?.failedLast24hCount),
        oldestQueuedAgeMs: resolveNullableSqlNumber(row?.oldestQueuedAgeMs),
    };
}

/**
 * Converts PostgreSQL count-like values into safe JavaScript numbers.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function resolveSqlCount(value: string | number | undefined): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

/**
 * Converts nullable numeric SQL values into safe JavaScript numbers.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function resolveNullableSqlNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Quotes one trusted internal table identifier for raw SQL usage.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Builds the shared union query that surfaces durable chat jobs and timeouts as one admin task stream.
 *
 * @private function of `getAdminChatTasksResponse`
 */
function createAdminChatTaskBaseQuery(options: {
    userChatJobTable: string;
    userChatTimeoutTable: string;
    userTable: string;
    agentTable: string;
}): string {
    return `
        SELECT
            job."id" AS "id",
            'CHAT_COMPLETION'::text AS "kind",
            job."status" AS "status",
            job."createdAt" AS "createdAt",
            job."queuedAt" AS "queuedAt",
            job."startedAt" AS "startedAt",
            job."updatedAt" AS "updatedAt",
            job."completedAt" AS "finishedAt",
            job."cancelRequestedAt" AS "cancelRequestedAt",
            NULL::TIMESTAMP WITH TIME ZONE AS "pausedAt",
            job."lastHeartbeatAt" AS "lastHeartbeatAt",
            job."leaseExpiresAt" AS "leaseExpiresAt",
            NULL::BIGINT AS "recurrenceIntervalMs",
            job."attemptCount" AS "attemptCount",
            job."failureReason" AS "lastErrorSummary",
            job."failureDetails" AS "lastErrorDetails",
            job."userId" AS "userId",
            "user"."username" AS "username",
            job."agentPermanentId" AS "agentPermanentId",
            agent."agentName" AS "agentName",
            job."chatId" AS "chatId"
        FROM ${options.userChatJobTable} job
        LEFT JOIN ${options.userTable} "user" ON "user"."id" = job."userId"
        LEFT JOIN ${options.agentTable} agent ON agent."permanentId" = job."agentPermanentId"

        UNION ALL

        SELECT
            timeout."id" AS "id",
            'CHAT_TIMEOUT'::text AS "kind",
            timeout."status" AS "status",
            timeout."createdAt" AS "createdAt",
            timeout."queuedAt" AS "queuedAt",
            timeout."startedAt" AS "startedAt",
            timeout."updatedAt" AS "updatedAt",
            timeout."completedAt" AS "finishedAt",
            timeout."cancelRequestedAt" AS "cancelRequestedAt",
            timeout."pausedAt" AS "pausedAt",
            NULL::TIMESTAMP WITH TIME ZONE AS "lastHeartbeatAt",
            timeout."leaseExpiresAt" AS "leaseExpiresAt",
            timeout."recurrenceIntervalMs" AS "recurrenceIntervalMs",
            timeout."attemptCount" AS "attemptCount",
            timeout."failureReason" AS "lastErrorSummary",
            NULL::TEXT AS "lastErrorDetails",
            timeout."userId" AS "userId",
            "user"."username" AS "username",
            timeout."agentPermanentId" AS "agentPermanentId",
            agent."agentName" AS "agentName",
            timeout."chatId" AS "chatId"
        FROM ${options.userChatTimeoutTable} timeout
        LEFT JOIN ${options.userTable} "user" ON "user"."id" = timeout."userId"
        LEFT JOIN ${options.agentTable} agent ON agent."permanentId" = timeout."agentPermanentId"
    `;
}

/**
 * Resolves one prefixed table name using the runtime-configured Supabase prefix.
 *
 * @private function of `getAdminChatTasksResponse`
 */
async function resolvePrefixedTableName(tableName: string): Promise<string> {
    const prefixedUserTable = await $getTableName('User');
    const tablePrefix = prefixedUserTable.slice(0, prefixedUserTable.length - 'User'.length);
    return `${tablePrefix}${tableName}`;
}
