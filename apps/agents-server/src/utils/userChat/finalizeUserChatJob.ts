import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { UserChatJobRecord, UserChatJobStatus } from './UserChatJobRecord';

/**
 * Final status values accepted when finishing one durable job.
 */
type FinalUserChatJobStatus = Extract<UserChatJobStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;

/**
 * Persists one final status for a durable chat job.
 */
export async function finalizeUserChatJob(options: {
    jobId: string;
    status: FinalUserChatJobStatus;
    provider?: string | null;
    failureReason?: string | null;
    failureDetails?: string | null;
}): Promise<UserChatJobRecord | null> {
    const nowIso = new Date().toISOString();
    try {
        const sql = await $provideClientSql();
        const userChatJobTable = quoteIdentifier(await $getTableName('UserChatJob'));
        const rows = await sql.raw<Array<UserChatJobRecord>>(
            `
                UPDATE ${userChatJobTable}
                SET
                    "status" = $1,
                    "updatedAt" = $2,
                    "completedAt" = $2,
                    "lastHeartbeatAt" = $2,
                    "leaseExpiresAt" = $2,
                    "provider" = $3,
                    "failureReason" = $4,
                    "failureDetails" = $5
                WHERE "id" = $6
                RETURNING
                    "id",
                    "createdAt",
                    "updatedAt",
                    "chatId",
                    "userId",
                    "agentPermanentId",
                    "userMessageId",
                    "assistantMessageId",
                    "clientMessageId",
                    "status",
                    "parameters",
                    "queuedAt",
                    "startedAt",
                    "completedAt",
                    "cancelRequestedAt",
                    "lastHeartbeatAt",
                    "leaseExpiresAt",
                    "attemptCount",
                    "provider",
                    "failureReason"
            `,
            [
                options.status,
                nowIso,
                options.provider ?? null,
                options.failureReason ?? null,
                options.failureDetails ?? null,
                options.jobId,
            ],
        );

        return rows[0] || null;
    } catch (error) {
        throw new Error(
            `Failed to finalize user chat job "${options.jobId}": ${error instanceof Error ? error.message : 'Unknown error.'}`,
        );
    }
}

/**
 * Quotes one trusted internal SQL identifier.
 *
 * @private function of `userChat`
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}
