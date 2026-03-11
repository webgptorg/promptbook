import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';
import { USER_CHAT_JOB_LEASE_DURATION_MS } from './claimNextQueuedUserChatJob';

/**
 * Extends one running job lease and returns its latest stored state.
 */
export async function heartbeatUserChatJob(jobId: string): Promise<UserChatJobRecord | null> {
    const now = new Date();
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + USER_CHAT_JOB_LEASE_DURATION_MS).toISOString();
    const userChatJobTable = await provideUserChatJobTable();

    const { data, error } = await userChatJobTable
        .update({
            updatedAt: nowIso,
            lastHeartbeatAt: nowIso,
            leaseExpiresAt,
        })
        .eq('id', jobId)
        .eq('status', 'RUNNING')
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to heartbeat user chat job "${jobId}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
