import { $provideClientSql } from '@/src/database/$provideClientSql';
import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { USER_CHAT_TIMEOUT_LEASE_DURATION_MS } from './USER_CHAT_TIMEOUT_LEASE_DURATION_MS';
import { getUserChatTimeoutTableName } from './getUserChatTimeoutTableName';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';
import { quoteIdentifier } from './quoteIdentifier';
import { rethrowUnlessMissingUserChatTimeoutRelation } from './rethrowUnlessMissingUserChatTimeoutRelation';

/**
 * Claims the next due timeout for exclusive processing.
 *
 * @private function of userChatTimeoutStore
 */
export async function claimNextDueUserChatTimeout(
    options: {
        preferredTimeoutId?: string;
    } = {},
): Promise<UserChatTimeoutRecord | null> {
    if (isAgentsServerSqliteMode()) {
        return claimNextDueUserChatTimeoutViaSupabaseQuery(options);
    }

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
 * Claims a due timeout through the shared table adapter when PostgreSQL-only raw SQL is unavailable.
 */
async function claimNextDueUserChatTimeoutViaSupabaseQuery(
    options: {
        preferredTimeoutId?: string;
    } = {},
): Promise<UserChatTimeoutRecord | null> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const now = new Date();
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + USER_CHAT_TIMEOUT_LEASE_DURATION_MS).toISOString();
    let candidateQuery = userChatTimeoutTable
        .select('*')
        .eq('status', 'QUEUED')
        .is('cancelRequestedAt', null)
        .is('pausedAt', null)
        .lte('dueAt', nowIso)
        .order('dueAt', { ascending: true })
        .order('createdAt', { ascending: true })
        .limit(1);

    if (options.preferredTimeoutId) {
        candidateQuery = candidateQuery.eq('id', options.preferredTimeoutId);
    }

    const { data: candidates, error: candidateError } = await candidateQuery;
    if (candidateError) {
        throw new Error(`Failed to load due user chat timeouts: ${candidateError.message}`);
    }

    const candidate = (candidates || [])[0] as UserChatTimeoutRow | undefined;
    if (!candidate) {
        return null;
    }

    const { data, error } = await userChatTimeoutTable
        .update({
            status: 'RUNNING',
            updatedAt: nowIso,
            startedAt: candidate.startedAt || nowIso,
            leaseExpiresAt,
            attemptCount: candidate.attemptCount + 1,
            failureReason: null,
        })
        .eq('id', candidate.id)
        .eq('status', 'QUEUED')
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to claim user chat timeout "${candidate.id}": ${error.message}`);
    }

    return data ? mapUserChatTimeoutRow(data as UserChatTimeoutRow) : null;
}
