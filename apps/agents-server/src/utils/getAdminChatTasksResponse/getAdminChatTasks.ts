import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { AdminChatTaskCounters, AdminChatTaskRecord, AdminChatTaskView } from '../chatTasksAdmin';
import type { ParsedAdminChatTaskQuery } from './parseAdminChatTaskQuery';
import type { UserChatJobStatus } from '../userChat/UserChatJobRecord';

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
