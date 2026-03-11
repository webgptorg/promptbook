import type { UserChatJobRecord, UserChatJobStatus } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

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
}): Promise<UserChatJobRecord | null> {
    const nowIso = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .update({
            status: options.status,
            updatedAt: nowIso,
            completedAt: nowIso,
            lastHeartbeatAt: nowIso,
            leaseExpiresAt: nowIso,
            provider: options.provider ?? null,
            failureReason: options.failureReason ?? null,
        })
        .eq('id', options.jobId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to finalize user chat job "${options.jobId}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
