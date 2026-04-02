import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';

/**
 * Default lease duration assigned to one claimed running job.
 *
 * @private function of `userChat`
 */
export const USER_CHAT_JOB_LEASE_DURATION_MS = 2 * 60 * 1000;

/**
 * Attempts to claim the next queued durable job for exclusive processing.
 */
export async function claimNextQueuedUserChatJob(options: {
    preferredJobId?: string;
} = {}): Promise<UserChatJobRecord | null> {
    const sql = await $provideClientSql();
    const tableIdentifier = quoteIdentifier(await $getTableName('UserChatJob'));
    const values: Array<unknown> = [USER_CHAT_JOB_LEASE_DURATION_MS];
    const preferredJobClause = options.preferredJobId ? `AND job."id" = $${values.push(options.preferredJobId)}` : '';

    const claimedRows = await sql.raw<Array<UserChatJobRow>>(
        `
            WITH candidate AS (
                SELECT job."id"
                FROM ${tableIdentifier} job
                WHERE job."status" = 'QUEUED'
                  AND job."cancelRequestedAt" IS NULL
                  ${preferredJobClause}
                ORDER BY job."queuedAt" ASC, job."createdAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            UPDATE ${tableIdentifier} job
            SET
                "status" = 'RUNNING',
                "updatedAt" = CURRENT_TIMESTAMP,
                "startedAt" = COALESCE(job."startedAt", CURRENT_TIMESTAMP),
                "lastHeartbeatAt" = CURRENT_TIMESTAMP,
                "leaseExpiresAt" = CURRENT_TIMESTAMP + ($1 * INTERVAL '1 millisecond'),
                "attemptCount" = job."attemptCount" + 1,
                "failureReason" = NULL
            FROM candidate
            WHERE job."id" = candidate."id"
            RETURNING job.*
        `,
        values,
    );

    return claimedRows[0] ? mapUserChatJobRow(claimedRows[0]) : null;
}

/**
 * Quotes one trusted internal table identifier for raw SQL usage.
 *
 * @private function of `userChat`
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
