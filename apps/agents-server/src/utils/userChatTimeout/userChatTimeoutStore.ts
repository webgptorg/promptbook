import type { TODO_any } from '@promptbook-local/types';
import type { Json } from '@/src/database/schema';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import type { UserChatTimeoutActivity } from '../userChat/UserChatRecord';
import { createUserChatTimeoutActivity } from './createUserChatTimeoutActivity';
import type {
    CreateUserChatTimeoutOptions,
    GetUserChatTimeoutOptions,
    ListUserChatTimeoutsOptions,
    UserChatTimeoutInsert,
    UserChatTimeoutParameters,
    UserChatTimeoutRecord,
    UserChatTimeoutRow,
} from './UserChatTimeoutRecord';

/**
 * Prefix used for generated timeout identifiers.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_ID_PREFIX = 'tmo_';

/**
 * Length of generated timeout id suffixes.
 *
 * @private internal utility of userChatTimeout
 */
const GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH = 14;

/**
 * Lease duration used while one timeout row is claimed by the worker.
 *
 * @private internal utility of userChatTimeout
 */
export const USER_CHAT_TIMEOUT_LEASE_DURATION_MS = 60_000;

/**
 * Active timeout statuses.
 *
 * @private internal utility of userChatTimeout
 */
const ACTIVE_USER_CHAT_TIMEOUT_STATUSES = ['QUEUED', 'RUNNING'] as const;

/**
 * Row fragment used when grouping active timeouts by chat without hydrating full timeout records.
 *
 * @private internal utility of userChatTimeout
 */
type UserChatTimeoutActivityRow = Pick<UserChatTimeoutRow, 'chatId' | 'dueAt'>;

/**
 * Maps one raw timeout row into an app-level record.
 *
 * @private internal utility of userChatTimeout
 */
function mapUserChatTimeoutRow(row: UserChatTimeoutRow): UserChatTimeoutRecord {
    return {
        id: row.id,
        timeoutId: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        chatId: row.chatId,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        status: row.status,
        message: row.message,
        parameters: normalizeUserChatTimeoutParameters(row.parameters),
        durationMs: row.durationMs,
        dueAt: row.dueAt,
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        leaseExpiresAt: row.leaseExpiresAt,
        attemptCount: row.attemptCount,
        failureReason: row.failureReason,
    };
}

/**
 * Normalizes persisted JSONB parameters for timeout execution.
 *
 * @private internal utility of userChatTimeout
 */
function normalizeUserChatTimeoutParameters(rawParameters: Json): UserChatTimeoutParameters {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        return {};
    }

    return rawParameters as UserChatTimeoutParameters;
}

/**
 * Provides the scoped Supabase query builder for `UserChatTimeout`.
 *
 * @private internal utility of userChatTimeout
 */
async function provideUserChatTimeoutTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getUserChatTimeoutTableName();

    return supabase.from(tableName);
}

/**
 * Creates one durable queued timeout for a chat thread.
 *
 * @private internal utility of userChatTimeout
 */
export async function createUserChatTimeout(options: CreateUserChatTimeoutOptions): Promise<UserChatTimeoutRecord> {
    const nowIso = new Date().toISOString();
    const timeoutId = options.id || `${USER_CHAT_TIMEOUT_ID_PREFIX}${$randomBase58(GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH)}`;
    const dueAt = options.dueAt || new Date(Date.now() + options.durationMs).toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const insertPayload: UserChatTimeoutInsert = {
        id: timeoutId,
        createdAt: nowIso,
        updatedAt: nowIso,
        chatId: options.chatId,
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        status: 'QUEUED',
        message: options.message || null,
        parameters: ((options.parameters || {}) satisfies Record<string, unknown>) as Json,
        durationMs: options.durationMs,
        dueAt,
        queuedAt: nowIso,
        attemptCount: 0,
    };

    const { data, error } = await userChatTimeoutTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        throw new Error(`Failed to create user chat timeout for chat "${options.chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to insert user chat timeout for chat "${options.chatId}".`);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}

/**
 * Lists scoped chat timeouts, optionally restricted to active rows only.
 *
 * @private internal utility of userChatTimeout
 */
export async function listUserChatTimeouts(options: ListUserChatTimeoutsOptions): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();

    let query = userChatTimeoutTable
        .select('*')
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (options.onlyActive) {
        query = query.in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to list user chat timeouts for chat "${options.chatId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatTimeoutRow>).map(mapUserChatTimeoutRow);
}

/**
 * Lists lightweight active-timeout metadata keyed by chat id for chat-history sidebars.
 *
 * @private internal utility of userChatTimeout
 */
export async function listUserChatTimeoutActivities(options: {
    userId: number;
    agentPermanentId: string;
    chatIds: ReadonlyArray<string>;
}): Promise<Record<string, UserChatTimeoutActivity>> {
    if (options.chatIds.length === 0) {
        return {};
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const uniqueChatIds = [...new Set(options.chatIds)];
    const { data, error } = await userChatTimeoutTable
        .select('chatId, dueAt')
        .in('chatId', uniqueChatIds)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (error) {
        throw new Error(`Failed to list timeout activity for user chats: ${error.message}`);
    }

    const groupedTimeoutsByChatId: Record<string, Array<Pick<UserChatTimeoutActivityRow, 'dueAt'>>> = {};

    for (const row of (data || []) as Array<UserChatTimeoutActivityRow>) {
        groupedTimeoutsByChatId[row.chatId] = [...(groupedTimeoutsByChatId[row.chatId] || []), { dueAt: row.dueAt }];
    }

    return Object.fromEntries(
        uniqueChatIds.map((chatId) => [chatId, createUserChatTimeoutActivity(groupedTimeoutsByChatId[chatId] || [])]),
    );
}

/**
 * Loads one timeout scoped to user, agent, and chat.
 *
 * @private internal utility of userChatTimeout
 */
export async function getUserChatTimeout(options: GetUserChatTimeoutOptions): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('*')
        .eq('id', options.timeoutId)
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Loads one timeout row by id regardless of scope.
 *
 * @private internal utility of userChatTimeout
 */
export async function getUserChatTimeoutById(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable.select('*').eq('id', timeoutId).maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Cancels one timeout. Queued rows become cancelled immediately; running rows get a cancellation request.
 *
 * @private internal utility of userChatTimeout
 */
export async function cancelUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (
        existingTimeout.status === 'COMPLETED' ||
        existingTimeout.status === 'FAILED' ||
        existingTimeout.status === 'CANCELLED'
    ) {
        return existingTimeout;
    }

    const nowIso = new Date().toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const updatePayload =
        existingTimeout.status === 'QUEUED'
            ? {
                  status: 'CANCELLED',
                  updatedAt: nowIso,
                  cancelRequestedAt: nowIso,
                  completedAt: nowIso,
                  leaseExpiresAt: null,
                  failureReason: existingTimeout.failureReason || 'Timeout was cancelled.',
              }
            : {
                  updatedAt: nowIso,
                  cancelRequestedAt: nowIso,
              };

    const { data, error } = await userChatTimeoutTable
        .update(updatePayload)
        .eq('id', timeoutId)
        .eq('status', existingTimeout.status)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to cancel user chat timeout "${timeoutId}": ${error.message}`);
    }

    if (!data) {
        return getUserChatTimeoutById(timeoutId);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}

/**
 * Requeues one failed timeout and makes it due immediately.
 *
 * @private internal utility of userChatTimeout
 */
export async function retryUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (existingTimeout.status !== 'FAILED') {
        throw new Error(
            `Only failed user chat timeouts can be retried. Timeout "${timeoutId}" is "${existingTimeout.status}".`,
        );
    }

    const nowIso = new Date().toISOString();
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'QUEUED',
            updatedAt: nowIso,
            dueAt: nowIso,
            queuedAt: nowIso,
            startedAt: null,
            completedAt: null,
            cancelRequestedAt: null,
            leaseExpiresAt: null,
            failureReason: null,
        })
        .eq('id', timeoutId)
        .eq('status', 'FAILED')
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to retry user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Marks one timeout as completed after its wake-up message was enqueued.
 *
 * @private internal utility of userChatTimeout
 */
export async function markUserChatTimeoutCompleted(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    return updateUserChatTimeoutTerminalState(timeoutId, 'COMPLETED', null);
}

/**
 * Marks one timeout as failed with a stored reason.
 *
 * @private internal utility of userChatTimeout
 */
export async function markUserChatTimeoutFailed(
    timeoutId: string,
    failureReason: string,
): Promise<UserChatTimeoutRecord | null> {
    return updateUserChatTimeoutTerminalState(timeoutId, 'FAILED', failureReason);
}

/**
 * Marks one timeout as cancelled with an optional stored reason.
 *
 * @private internal utility of userChatTimeout
 */
export async function markUserChatTimeoutCancelled(
    timeoutId: string,
    failureReason = 'Timeout was cancelled.',
): Promise<UserChatTimeoutRecord | null> {
    return updateUserChatTimeoutTerminalState(timeoutId, 'CANCELLED', failureReason);
}

/**
 * Counts active timeouts for one chat thread.
 *
 * @private internal utility of userChatTimeout
 */
export async function countActiveUserChatTimeoutsForChat(chatId: string): Promise<number> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { count, error } = await userChatTimeoutTable
        .select('*', { count: 'exact', head: true })
        .eq('chatId', chatId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES);

    if (error) {
        throw new Error(`Failed to count active user chat timeouts for chat "${chatId}": ${error.message}`);
    }

    return count || 0;
}

/**
 * Counts completed timeout firings for one chat thread since the provided timestamp.
 *
 * @private internal utility of userChatTimeout
 */
export async function countCompletedUserChatTimeoutsForChatSince(chatId: string, sinceIso: string): Promise<number> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { count, error } = await userChatTimeoutTable
        .select('*', { count: 'exact', head: true })
        .eq('chatId', chatId)
        .eq('status', 'COMPLETED')
        .gte('completedAt', sinceIso);

    if (error) {
        throw new Error(`Failed to count completed user chat timeouts for chat "${chatId}": ${error.message}`);
    }

    return count || 0;
}

/**
 * Recovers timeouts whose worker lease expired before reaching a terminal state.
 *
 * @private internal utility of userChatTimeout
 */
export async function recoverExpiredRunningUserChatTimeouts(): Promise<number> {
    const sql = await $provideClientSql();
    const tableIdentifier = quoteIdentifier(await getUserChatTimeoutTableName());
    const recoveredRows = await sql.raw<Array<{ id: string }>>(
        `
            UPDATE ${tableIdentifier}
            SET
                "status" = CASE
                    WHEN "cancelRequestedAt" IS NOT NULL THEN 'CANCELLED'
                    ELSE 'QUEUED'
                END,
                "updatedAt" = CURRENT_TIMESTAMP,
                "startedAt" = CASE
                    WHEN "cancelRequestedAt" IS NOT NULL THEN "startedAt"
                    ELSE NULL
                END,
                "completedAt" = CASE
                    WHEN "cancelRequestedAt" IS NOT NULL THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                "leaseExpiresAt" = NULL,
                "failureReason" = CASE
                    WHEN "cancelRequestedAt" IS NOT NULL THEN COALESCE("failureReason", 'Timeout was cancelled.')
                    ELSE "failureReason"
                END
            WHERE "status" = 'RUNNING'
              AND "leaseExpiresAt" IS NOT NULL
              AND "leaseExpiresAt" < CURRENT_TIMESTAMP
            RETURNING "id"
        `,
    );

    return recoveredRows.length;
}

/**
 * Claims the next due timeout for exclusive processing.
 *
 * @private internal utility of userChatTimeout
 */
export async function claimNextDueUserChatTimeout(options: {
    preferredTimeoutId?: string;
} = {}): Promise<UserChatTimeoutRecord | null> {
    const sql = await $provideClientSql();
    const tableIdentifier = quoteIdentifier(await getUserChatTimeoutTableName());
    const values: Array<unknown> = [USER_CHAT_TIMEOUT_LEASE_DURATION_MS];
    const preferredTimeoutClause = options.preferredTimeoutId
        ? `AND timeout."id" = $${values.push(options.preferredTimeoutId)}`
        : '';
    const claimedRows = await sql.raw<Array<UserChatTimeoutRow>>(
        `
            WITH candidate AS (
                SELECT timeout."id"
                FROM ${tableIdentifier} timeout
                WHERE timeout."status" = 'QUEUED'
                  AND timeout."cancelRequestedAt" IS NULL
                  AND timeout."dueAt" <= CURRENT_TIMESTAMP
                  ${preferredTimeoutClause}
                ORDER BY timeout."dueAt" ASC, timeout."createdAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            UPDATE ${tableIdentifier} timeout
            SET
                "status" = 'RUNNING',
                "updatedAt" = CURRENT_TIMESTAMP,
                "startedAt" = COALESCE(timeout."startedAt", CURRENT_TIMESTAMP),
                "leaseExpiresAt" = CURRENT_TIMESTAMP + ($1 * INTERVAL '1 millisecond'),
                "attemptCount" = timeout."attemptCount" + 1,
                "failureReason" = NULL
            FROM candidate
            WHERE timeout."id" = candidate."id"
            RETURNING timeout.*
        `,
        values,
    );

    return claimedRows[0] ? mapUserChatTimeoutRow(claimedRows[0]) : null;
}

/**
 * Updates one timeout into a terminal state.
 *
 * @private internal utility of userChatTimeout
 */
async function updateUserChatTimeoutTerminalState(
    timeoutId: string,
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED',
    failureReason: string | null,
): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userChatTimeoutTable
        .update({
            status,
            updatedAt: nowIso,
            completedAt: nowIso,
            leaseExpiresAt: null,
            failureReason,
        })
        .eq('id', timeoutId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to update user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Quotes one trusted internal table identifier for raw SQL usage.
 *
 * @private internal utility of userChatTimeout
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Resolves the prefixed timeout table name without relying on generated schema typings.
 *
 * @private internal utility of userChatTimeout
 */
async function getUserChatTimeoutTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}UserChatTimeout`;
}
