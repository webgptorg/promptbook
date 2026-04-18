import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';
import { USER_CHAT_JOB_LEASE_DURATION_MS } from './claimNextQueuedUserChatJob';
import { USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS } from './userChatJobRuntimeConstants';

/**
 * Extends one running job lease and returns its latest stored state.
 */
export async function heartbeatUserChatJob(jobId: string): Promise<UserChatJobRecord | null> {
    const now = new Date();
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + USER_CHAT_JOB_LEASE_DURATION_MS).toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
        abortController.abort();
    }, USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS);
    timeout.unref?.();

    try {
        const { data, error } = await userChatJobTable
            .update({
                updatedAt: nowIso,
                lastHeartbeatAt: nowIso,
                leaseExpiresAt,
            })
            .eq('id', jobId)
            .eq('status', 'RUNNING')
            .abortSignal(abortController.signal)
            .select('*')
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to heartbeat user chat job "${jobId}": ${error.message}`);
        }

        return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
    } catch (error) {
        if (abortController.signal.aborted) {
            throw new Error(
                `Timed out while heartbeating user chat job "${jobId}" after ${USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS} ms.`,
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
