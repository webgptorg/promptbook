import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Marks one queued or running job as cancellation-requested.
 */
export async function requestUserChatJobCancellation(jobId: string): Promise<UserChatJobRecord | null> {
    const nowIso = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .update({
            updatedAt: nowIso,
            cancelRequestedAt: nowIso,
        })
        .eq('id', jobId)
        .in('status', ['QUEUED', 'RUNNING'])
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to request cancellation for user chat job "${jobId}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
