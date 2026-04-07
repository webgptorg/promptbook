import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import { recoverExpiredRunningUserChatJobs } from '@/src/utils/userChat/recoverExpiredRunningUserChatJobs';
import { recoverExpiredRunningUserChatTimeouts } from '@/src/utils/userChatTimeout';
import { ensureUserChatTimeoutWorkerBootstrapped } from '@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import type {
    AdminChatTaskCounters,
    AdminChatTaskListResponse,
    AdminChatTaskRecord,
    AdminChatTaskView,
} from './chatTasksAdmin';
import type { UserChatJobStatus } from './userChat/UserChatJobRecord';

/**
 * Minimum interval between recovery operations triggered by admin polls.
 *
 * @private internal admin utility of Agents Server
 */
const ADMIN_RECOVERY_THROTTLE_MS = 60_000;

/**
 * Timestamp of the last completed admin recovery run.
 *
 * @private internal admin singleton
 */
let lastAdminRecoveryAt = 0;

/**
 * In-flight recovery promise used to deduplicate overlapping admin polls.
 *
 * @private internal admin singleton
 */
let pendingAdminRecovery: Promise<void> | null = null;

/**
 * Runs recovery operations at most once per throttle interval, deduplicating concurrent calls.
 *
 * @private internal admin utility of Agents Server
 */
async function throttledAdminRecovery(): Promise<void> {
    if (Date.now() - lastAdminRecoveryAt < ADMIN_RECOVERY_THROTTLE_MS) {
        return;
    }

    if (pendingAdminRecovery) {
        return pendingAdminRecovery;
    }

    pendingAdminRecovery = (async () => {
        try {
            await recoverExpiredRunningUserChatJobs();
            await recoverExpiredRunningUserChatTimeouts();
            lastAdminRecoveryAt = Date.now();
        } finally {
            pendingAdminRecovery = null;
        }
    })();

    return pendingAdminRecovery;
}

/**
 * Default number of task rows returned per page.
 *
 * @private internal admin utility of Agents Server
 */
const DEFAULT_ADMIN_CHAT_TASK_PAGE_SIZE = 50;

/**
 * Maximum number of task rows returned per page.
 *
 * @private internal admin utility of Agents Server
 */
const MAX_ADMIN_CHAT_TASK_PAGE_SIZE = 200;

/**
 * Default recent-history window used by the `All` tab.
 *
 * @private internal admin utility of Agents Server
 */
const DEFAULT_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS = 24;

/**
 * Upper bound for the configurable `All`-view time window.
 *
 * @private internal admin utility of Agents Server
 */
const MAX_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS = 24 * 30;

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
 * Parsed and normalized admin task-manager query params.
 *
 * @private internal admin utility of Agents Server
 */
type ParsedAdminChatTaskQuery = {
    page: number;
    pageSize: number;
    view: AdminChatTaskView;
    search: string;
    timeWindowHours: number;
};

/**
 * Raw SQL row returned by the paginated admin task query.
 *
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
 */
type AdminChatTaskCountersSqlRow = {
    runningCount: string | number;
    queuedCount: string | number;
    failedLast24hCount: string | number;
    oldestQueuedAgeMs: string | number | null;
};

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
    const listQueryParts = createAdminChatTaskListQueryParts(parsedQuery);
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
            ORDER BY ${createAdminChatTaskOrderBySql(parsedQuery.view, 'task')}
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
        status: 200,
        response: {
            items: listRows.map(mapAdminChatTaskSqlRow),
            counters: mapAdminChatTaskCounters(counterRows[0]),
            total: resolveSqlCount(listRows[0]?.totalCount),
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
 * Parses and normalizes the admin task-manager query string.
 *
 * @private internal admin utility of Agents Server
 */
function parseAdminChatTaskQuery(searchParams: URLSearchParams): ParsedAdminChatTaskQuery | null {
    const view = parseAdminChatTaskView(searchParams.get('view'));
    if (!view) {
        return null;
    }

    return {
        page: parsePositiveInteger(searchParams.get('page'), 1),
        pageSize: Math.min(
            MAX_ADMIN_CHAT_TASK_PAGE_SIZE,
            parsePositiveInteger(searchParams.get('pageSize'), DEFAULT_ADMIN_CHAT_TASK_PAGE_SIZE),
        ),
        view,
        search: searchParams.get('search')?.trim() || '',
        timeWindowHours: parsePositiveInteger(
            searchParams.get('timeWindowHours'),
            DEFAULT_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS,
            MAX_ADMIN_CHAT_TASK_TIME_WINDOW_HOURS,
        ),
    };
}

/**
 * Parses one positive integer query parameter with fallback and upper bound.
 *
 * @private internal admin utility of Agents Server
 */
function parsePositiveInteger(value: string | null, fallback: number, max = Number.POSITIVE_INFINITY): number {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, max);
}

/**
 * Parses the requested admin task-manager view.
 *
 * @private internal admin utility of Agents Server
 */
function parseAdminChatTaskView(value: string | null): AdminChatTaskView | null {
    if (
        value === 'active' ||
        value === 'running' ||
        value === 'queued' ||
        value === 'failed' ||
        value === 'all' ||
        value === null
    ) {
        return value || 'active';
    }

    return null;
}

/**
 * Creates the `WHERE` clause and parameter list for the paginated admin task query.
 *
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Builds the shared union query that surfaces durable chat jobs and timeouts as one admin task stream.
 *
 * @private internal admin utility of Agents Server
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
 * @private internal admin utility of Agents Server
 */
async function resolvePrefixedTableName(tableName: string): Promise<string> {
    const prefixedUserTable = await $getTableName('User');
    const tablePrefix = prefixedUserTable.slice(0, prefixedUserTable.length - 'User'.length);
    return `${tablePrefix}${tableName}`;
}
