import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { USER_CHAT_TIMEOUT_LEASE_DURATION_MS } from './USER_CHAT_TIMEOUT_LEASE_DURATION_MS';
import { getUserChatTimeoutTableName } from './getUserChatTimeoutTableName';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
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
