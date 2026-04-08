import { $provideClientSql } from '@/src/database/$provideClientSql';
import { getUserChatTimeoutTableName } from './getUserChatTimeoutTableName';
import { quoteIdentifier } from './quoteIdentifier';
import { rethrowUnlessMissingUserChatTimeoutRelation } from './rethrowUnlessMissingUserChatTimeoutRelation';

/**
 * Recovers timeouts whose worker lease expired before reaching a terminal state.
 *
 * @private function of userChatTimeoutStore
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
