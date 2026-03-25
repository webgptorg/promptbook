import { $provideClientSql } from '@/src/database/$provideClientSql';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { Json } from '@/src/database/schema';
import { $provideServer } from '@/src/tools/$provideServer';
import type { TODO_any } from '@promptbook-local/types';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import type { UserChatTimeoutActivity } from '../userChat/UserChatRecord';
import { createUserChatTimeoutActivity } from './createUserChatTimeoutActivity';
import type {
    CreateUserChatTimeoutOptions,
    GetAgentScopedUserChatTimeoutOptions,
    GetUserChatTimeoutOptions,
    ListAgentUserChatTimeoutsOptions,
    ListUserChatTimeoutsOptions,
    UpdateAgentScopedUserChatTimeoutOptions,
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
 * Human-readable fallback used when timeout persistence is unavailable because
 * the database migration has not been applied yet.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE =
    'User chat timeouts are unavailable until the `UserChatTimeout` database migration is applied.';

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
        recurrenceIntervalMs: normalizeRecurrenceIntervalMs(row.recurrenceIntervalMs),
        queuedAt: row.queuedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        cancelRequestedAt: row.cancelRequestedAt,
        pausedAt: row.pausedAt || null,
        leaseExpiresAt: row.leaseExpiresAt,
        attemptCount: row.attemptCount,
        runCount: typeof row.runCount === 'number' ? row.runCount : 0,
        lastFiredAt: row.lastFiredAt || null,
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
 * Normalizes optional recurrence interval values in milliseconds.
 *
 * @private internal utility of userChatTimeout
 */
function normalizeRecurrenceIntervalMs(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    if (value <= 0) {
        return null;
    }

    return Math.max(1, Math.floor(value));
}

/**
 * Returns `true` when a timeout-table query failed because the relation does not exist yet.
 *
 * @private internal utility of userChatTimeout
 */
function isMissingUserChatTimeoutRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : '';
    const message =
        typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : String(error);

    return code === '42P01' || code === 'PGRST205' || /relation .* does not exist/i.test(message);
}

/**
 * Throws the original error unless it represents a missing timeout table.
 *
 * @private internal utility of userChatTimeout
 */
function rethrowUnlessMissingUserChatTimeoutRelation(error: unknown): void {
    if (isMissingUserChatTimeoutRelationError(error)) {
        return;
    }

    throw error;
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
    const timeoutId =
        options.id || `${USER_CHAT_TIMEOUT_ID_PREFIX}${$randomBase58(GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH)}`;
    const dueAt = options.dueAt || new Date(Date.now() + options.durationMs).toISOString();
    const recurrenceIntervalMs = normalizeRecurrenceIntervalMs(options.recurrenceIntervalMs);
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
        parameters: (options.parameters || {}) satisfies Record<string, unknown> as Json,
        durationMs: options.durationMs,
        dueAt,
        recurrenceIntervalMs,
        queuedAt: nowIso,
        pausedAt: null,
        attemptCount: 0,
        runCount: 0,
        lastFiredAt: null,
    };

    const { data, error } = await userChatTimeoutTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            throw new Error(USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE);
        }

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
export async function listUserChatTimeouts(
    options: ListUserChatTimeoutsOptions,
): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();

    let query = userChatTimeoutTable
        .select('*')
        .eq('chatId', options.chatId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (options.onlyActive) {
        query = query.in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES).is('pausedAt', null);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

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
    userId?: number;
    agentPermanentId: string;
    chatIds: ReadonlyArray<string>;
}): Promise<Record<string, UserChatTimeoutActivity>> {
    if (options.chatIds.length === 0) {
        return {};
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const uniqueChatIds = [...new Set(options.chatIds)];
    let query = userChatTimeoutTable
        .select('chatId, dueAt')
        .in('chatId', uniqueChatIds)
        .eq('agentPermanentId', options.agentPermanentId)
        .in('status', ACTIVE_USER_CHAT_TIMEOUT_STATUSES)
        .is('pausedAt', null)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true });

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return {};
        }

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
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Loads one timeout scoped to user and agent regardless of chat.
 *
 * @private internal utility of userChatTimeout
 */
export async function getAgentScopedUserChatTimeout(
    options: GetAgentScopedUserChatTimeoutOptions,
): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .select('*')
        .eq('id', options.timeoutId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load scoped user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Lists all timeouts owned by one user+agent across all chats.
 *
 * @private internal utility of userChatTimeout
 */
export async function listAgentUserChatTimeouts(
    options: ListAgentUserChatTimeoutsOptions,
): Promise<Array<UserChatTimeoutRecord>> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    let query = userChatTimeoutTable
        .select('*')
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .order('updatedAt', { ascending: false })
        .order('createdAt', { ascending: false });

    if (options.statuses && options.statuses.length > 0) {
        query = query.in('status', options.statuses);
    }

    if (typeof options.paused === 'boolean') {
        query = options.paused ? query.not('pausedAt', 'is', null) : query.is('pausedAt', null);
    } else if (options.includePaused === false) {
        query = query.is('pausedAt', null);
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
        const offset = typeof options.offset === 'number' && options.offset > 0 ? options.offset : 0;
        query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to list scoped user chat timeouts for agent "${options.agentPermanentId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatTimeoutRow>).map(mapUserChatTimeoutRow);
}

/**
 * Updates one timeout scoped by user and agent.
 *
 * @private internal utility of userChatTimeout
 */
export async function updateAgentScopedUserChatTimeout(
    options: UpdateAgentScopedUserChatTimeoutOptions,
): Promise<UserChatTimeoutRecord | null> {
    const existingTimeout = await getAgentScopedUserChatTimeout(options);

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

    if (existingTimeout.status === 'RUNNING') {
        return existingTimeout;
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
        updatedAt: nowIso,
    };

    let hasPatchChanges = false;

    if (Object.prototype.hasOwnProperty.call(options.patch, 'message')) {
        updatePayload.message =
            typeof options.patch.message === 'string' && options.patch.message.trim().length > 0
                ? options.patch.message.trim()
                : null;
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'parameters')) {
        updatePayload.parameters = (options.patch.parameters || {}) satisfies Record<string, unknown> as Json;
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'recurrenceIntervalMs')) {
        updatePayload.recurrenceIntervalMs = normalizeRecurrenceIntervalMs(options.patch.recurrenceIntervalMs);
        hasPatchChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(options.patch, 'pausedAt')) {
        updatePayload.pausedAt = options.patch.pausedAt || null;
        hasPatchChanges = true;
    }

    const nextDueAtIso = resolvePatchedDueAtIso({
        existingDueAt: existingTimeout.dueAt,
        dueAt: options.patch.dueAt,
        extendByMs: options.patch.extendByMs,
    });

    if (nextDueAtIso !== null) {
        updatePayload.dueAt = nextDueAtIso;
        updatePayload.queuedAt = nowIso;
        updatePayload.durationMs = Math.max(0, Date.parse(nextDueAtIso) - Date.now());
        hasPatchChanges = true;
    }

    if (!hasPatchChanges) {
        return existingTimeout;
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { data, error } = await userChatTimeoutTable
        .update(updatePayload)
        .eq('id', options.timeoutId)
        .eq('userId', options.userId)
        .eq('agentPermanentId', options.agentPermanentId)
        .eq('status', existingTimeout.status)
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to update scoped user chat timeout "${options.timeoutId}": ${error.message}`);
    }

    if (!data) {
        return getAgentScopedUserChatTimeout(options);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
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
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

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
                  pausedAt: null,
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
            pausedAt: null,
            leaseExpiresAt: null,
            failureReason: null,
        })
        .eq('id', timeoutId)
        .eq('status', 'FAILED')
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

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
    const existingTimeout = await getUserChatTimeoutById(timeoutId);

    if (!existingTimeout) {
        return null;
    }

    if (existingTimeout.status === 'COMPLETED') {
        return existingTimeout;
    }

    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'COMPLETED',
            updatedAt: nowIso,
            completedAt: nowIso,
            leaseExpiresAt: null,
            pausedAt: null,
            failureReason: null,
            runCount: existingTimeout.runCount + 1,
            lastFiredAt: nowIso,
        })
        .eq('id', timeoutId)
        .eq('status', existingTimeout.status)
        .eq('runCount', existingTimeout.runCount)
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to mark user chat timeout "${timeoutId}" as completed: ${error.message}`);
    }

    if (!data) {
        return getUserChatTimeoutById(timeoutId);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
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
        if (isMissingUserChatTimeoutRelationError(error)) {
            return 0;
        }

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
        if (isMissingUserChatTimeoutRelationError(error)) {
            return 0;
        }

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
    let recoveredRows: Array<{ id: string }>;

    try {
        recoveredRows = await sql.raw<Array<{ id: string }>>(
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
    } catch (error) {
        rethrowUnlessMissingUserChatTimeoutRelation(error);
        return 0;
    }

    return recoveredRows.length;
}

/**
 * Claims the next due timeout for exclusive processing.
 *
 * @private internal utility of userChatTimeout
 */
export async function claimNextDueUserChatTimeout(
    options: {
        preferredTimeoutId?: string;
    } = {},
): Promise<UserChatTimeoutRecord | null> {
    const sql = await $provideClientSql();
    const tableIdentifier = quoteIdentifier(await getUserChatTimeoutTableName());
    const values: Array<unknown> = [USER_CHAT_TIMEOUT_LEASE_DURATION_MS];
    const preferredTimeoutClause = options.preferredTimeoutId
        ? `AND timeout."id" = $${values.push(options.preferredTimeoutId)}`
        : '';
    let claimedRows: Array<UserChatTimeoutRow>;

    try {
        claimedRows = await sql.raw<Array<UserChatTimeoutRow>>(
            `
                WITH candidate AS (
                    SELECT timeout."id"
                    FROM ${tableIdentifier} timeout
                    WHERE timeout."status" = 'QUEUED'
                      AND timeout."cancelRequestedAt" IS NULL
                      AND timeout."pausedAt" IS NULL
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
    } catch (error) {
        rethrowUnlessMissingUserChatTimeoutRelation(error);
        return null;
    }

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
            pausedAt: null,
            failureReason,
        })
        .eq('id', timeoutId)
        .select('*')
        .maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to update user chat timeout "${timeoutId}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}

/**
 * Resolves optional due-date mutations for timeout edits.
 *
 * @private internal utility of userChatTimeout
 */
function resolvePatchedDueAtIso(options: {
    existingDueAt: string;
    dueAt?: string;
    extendByMs?: number;
}): string | null {
    const hasDueAtPatch = typeof options.dueAt === 'string';
    const hasExtendPatch = typeof options.extendByMs === 'number';

    if (!hasDueAtPatch && !hasExtendPatch) {
        return null;
    }

    if (hasDueAtPatch && hasExtendPatch) {
        throw new Error('Timeout updates must patch either `dueAt` or `extendByMs`, not both.');
    }

    if (hasDueAtPatch) {
        const dueAtTimestamp = Date.parse(options.dueAt!);
        if (!Number.isFinite(dueAtTimestamp)) {
            throw new Error('Timeout `dueAt` must be a valid ISO timestamp.');
        }

        return new Date(dueAtTimestamp).toISOString();
    }

    const extendByMs = options.extendByMs!;
    if (!Number.isFinite(extendByMs) || extendByMs <= 0) {
        throw new Error('Timeout `extendByMs` must be a positive number of milliseconds.');
    }

    const existingDueAtTimestamp = Date.parse(options.existingDueAt);
    if (!Number.isFinite(existingDueAtTimestamp)) {
        throw new Error('Cannot extend timeout with invalid existing due date.');
    }

    return new Date(existingDueAtTimestamp + Math.floor(extendByMs)).toISOString();
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
