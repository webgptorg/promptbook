import { $provideClientSql } from '@/src/database/$provideClientSql';
import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import { getUserChatTimeoutTableName } from './getUserChatTimeoutTableName';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';
import { quoteIdentifier } from './quoteIdentifier';
import { rethrowUnlessMissingUserChatTimeoutRelation } from './rethrowUnlessMissingUserChatTimeoutRelation';

/**
 * Recovers timeouts whose worker lease expired before reaching a terminal state.
 *
 * @private function of userChatTimeoutStore
 */
export async function recoverExpiredRunningUserChatTimeouts(): Promise<number> {
    if (isAgentsServerSqliteMode()) {
        return recoverExpiredRunningUserChatTimeoutsViaSupabaseQuery();
    }

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
 * Recovers expired timeout leases through the shared table adapter when raw PostgreSQL is unavailable.
 */
async function recoverExpiredRunningUserChatTimeoutsViaSupabaseQuery(): Promise<number> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userChatTimeoutTable
        .select('id, cancelRequestedAt, failureReason')
        .eq('status', 'RUNNING')
        .not('leaseExpiresAt', 'is', null)
        .lt('leaseExpiresAt', nowIso);

    if (error) {
        throw new Error(`Failed to load expired running user chat timeouts: ${error.message}`);
    }

    let recoveredCount = 0;
    for (const row of data || []) {
        const timeoutRow = row as { id: string; cancelRequestedAt: string | null; failureReason: string | null };
        const isCancelled = timeoutRow.cancelRequestedAt !== null;
        const updateResult = await userChatTimeoutTable
            .update({
                status: isCancelled ? 'CANCELLED' : 'QUEUED',
                updatedAt: nowIso,
                startedAt: isCancelled ? undefined : null,
                completedAt: isCancelled ? nowIso : null,
                leaseExpiresAt: null,
                failureReason: isCancelled ? timeoutRow.failureReason || 'Timeout was cancelled.' : timeoutRow.failureReason,
            })
            .eq('id', timeoutRow.id);

        if (updateResult.error) {
            throw new Error(`Failed to recover expired user chat timeout "${timeoutRow.id}": ${updateResult.error.message}`);
        }

        recoveredCount++;
    }

    return recoveredCount;
}
