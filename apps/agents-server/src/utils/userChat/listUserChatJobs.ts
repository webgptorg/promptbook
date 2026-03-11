import type { ListUserChatJobsOptions, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Lists scoped chat jobs, optionally restricted to active rows only.
 */
export async function listUserChatJobs(options: ListUserChatJobsOptions): Promise<Array<UserChatJobRecord>> {
    const { userId, agentPermanentId, chatId, onlyActive = false } = options;
    const userChatJobTable = await provideUserChatJobTable();

    let query = userChatJobTable
        .select('*')
        .eq('chatId', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .order('createdAt', { ascending: true });

    if (onlyActive) {
        query = query.in('status', ['QUEUED', 'RUNNING']);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to list user chat jobs for chat "${chatId}": ${error.message}`);
    }

    return ((data || []) as Array<UserChatJobRow>).map(mapUserChatJobRow);
}
