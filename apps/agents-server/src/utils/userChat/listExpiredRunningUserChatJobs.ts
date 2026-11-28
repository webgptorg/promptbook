import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Upper bound for one stale-job recovery batch.
 *
 * @private function of `userChat`
 */
const EXPIRED_USER_CHAT_JOB_LIMIT = 20;

/**
 * Lists running jobs whose worker lease has expired.
 */
export async function listExpiredRunningUserChatJobs(): Promise<Array<UserChatJobRecord>> {
    const nowIso = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .select('*')
        .eq('status', 'RUNNING')
        .lt('leaseExpiresAt', nowIso)
        .order('leaseExpiresAt', { ascending: true })
        .limit(EXPIRED_USER_CHAT_JOB_LIMIT);

    if (error) {
        throw new Error(`Failed to list expired user chat jobs: ${error.message}`);
    }

    return ((data || []) as Array<UserChatJobRow>).map(mapUserChatJobRow);
}
