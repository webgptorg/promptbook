import type { AdminChatTaskSortField, AdminChatTaskSortOrder, AdminChatTaskView } from '../../chatTasksAdmin';
import type { ParsedAdminChatTaskQuery } from '../parseAdminChatTaskQuery';

/**
 * Builds the shared union query that surfaces durable chat jobs and timeouts as one admin task stream.
 *
 * @private function of `getAdminChatTasks`
 */
export function createAdminChatTaskBaseQuery(options: {
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
            job."chatId" AS "chatId",
            'user-chat-jobs'::text AS "queueName",
            job."parameters" AS "parameters"
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
            timeout."chatId" AS "chatId",
            'user-chat-timeouts'::text AS "queueName",
            NULL::JSONB AS "parameters"
        FROM ${options.userChatTimeoutTable} timeout
        LEFT JOIN ${options.userTable} "user" ON "user"."id" = timeout."userId"
        LEFT JOIN ${options.agentTable} agent ON agent."permanentId" = timeout."agentPermanentId"
    `;
}

/**
 * Builds the paginated admin task list query together with its bound parameter values.
 *
 * @private function of `getAdminChatTasks`
 */
export function createAdminChatTaskListQuery(options: { baseTaskQuery: string; query: ParsedAdminChatTaskQuery }): {
    sql: string;
    values: Array<string | number>;
} {
    const listQueryParts = createAdminChatTaskListQueryParts(options.query);

    return {
        sql: `
            WITH tasks AS (
                ${options.baseTaskQuery}
            )
            SELECT
                task.*,
                COUNT(*) OVER() AS "totalCount"
            FROM tasks task
            ${listQueryParts.whereClause}
            ORDER BY ${createAdminChatTaskOrderBySql(options.query, 'task')}
            LIMIT $${listQueryParts.limitPlaceholder}
            OFFSET $${listQueryParts.offsetPlaceholder}
        `,
        values: listQueryParts.values,
    };
}

/**
 * Builds the task-manager summary counters query.
 *
 * @private function of `getAdminChatTasks`
 */
export function createAdminChatTaskCountersQuery(options: { baseTaskQuery: string }): string {
    return `
        WITH tasks AS (
            ${options.baseTaskQuery}
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
    `;
}

/**
 * Creates the `WHERE` clause and parameter list for the paginated admin task query.
 *
 * @private function of `getAdminChatTasks`
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
 * @private function of `getAdminChatTasks`
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
 * @private function of `getAdminChatTasks`
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
 * @private function of `getAdminChatTasks`
 */
function createAdminChatTaskOrderBySql(query: ParsedAdminChatTaskQuery, alias: string): string {
    const defaultOrderBySql = createAdminChatTaskDefaultOrderBySql(query.view, alias);

    if (query.sortBy === 'default') {
        return defaultOrderBySql;
    }

    return `${createAdminChatTaskCustomOrderBySql(query.sortBy, query.sortOrder, alias)}, ${defaultOrderBySql}`;
}

/**
 * Resolves the stable default sort order used by each dashboard view.
 *
 * @private function of `getAdminChatTasks`
 */
function createAdminChatTaskDefaultOrderBySql(view: AdminChatTaskView, alias: string): string {
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
 * Resolves SQL order expressions for a sortable task-manager column.
 *
 * @private function of `getAdminChatTasks`
 */
function createAdminChatTaskCustomOrderBySql(
    sortBy: Exclude<AdminChatTaskSortField, 'default'>,
    sortOrder: AdminChatTaskSortOrder,
    alias: string,
): string {
    const direction = sortOrder.toUpperCase();

    switch (sortBy) {
        case 'task':
            return `${alias}."id" ${direction} NULLS LAST`;
        case 'ownership':
            return [
                `NULLIF(LOWER(COALESCE(${alias}."username", '')), '') ${direction} NULLS LAST`,
                `${alias}."userId" ${direction} NULLS LAST`,
                `NULLIF(LOWER(COALESCE(${alias}."agentName", '')), '') ${direction} NULLS LAST`,
                `${alias}."agentPermanentId" ${direction} NULLS LAST`,
                `${alias}."chatId" ${direction} NULLS LAST`,
            ].join(', ');
        case 'timeline':
            return `${createAdminChatTaskTimelineExpressionSql(alias)} ${direction} NULLS LAST`;
        case 'duration':
            return `${createAdminChatTaskDurationExpressionSql(alias)} ${direction} NULLS LAST`;
        case 'queue':
            return [
                `NULLIF(LOWER(COALESCE(${alias}."queueName", '')), '') ${direction} NULLS LAST`,
                `${alias}."leaseExpiresAt" ${direction} NULLS LAST`,
            ].join(', ');
        case 'lastError':
            return `NULLIF(LOWER(COALESCE(${alias}."lastErrorSummary", '')), '') ${direction} NULLS LAST`;
    }
}

/**
 * Builds the SQL timestamp expression used by the task timeline column.
 *
 * @private function of `getAdminChatTasks`
 */
function createAdminChatTaskTimelineExpressionSql(alias: string): string {
    return `
        CASE
            WHEN ${alias}."status" = 'RUNNING' THEN COALESCE(${alias}."startedAt", ${alias}."createdAt")
            WHEN ${alias}."status" = 'QUEUED' THEN ${alias}."createdAt"
            ELSE COALESCE(${alias}."finishedAt", ${alias}."updatedAt", ${alias}."createdAt")
        END
    `;
}

/**
 * Builds the SQL duration expression used by the task duration column.
 *
 * @private function of `getAdminChatTasks`
 */
function createAdminChatTaskDurationExpressionSql(alias: string): string {
    return `EXTRACT(EPOCH FROM (COALESCE(${alias}."finishedAt", ${alias}."updatedAt", CURRENT_TIMESTAMP) - ${alias}."createdAt"))`;
}
