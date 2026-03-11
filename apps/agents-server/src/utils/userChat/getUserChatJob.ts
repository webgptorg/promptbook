import type { GetUserChatJobOptions, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Loads one scoped chat job by id.
 */
export async function getUserChatJob(options: GetUserChatJobOptions): Promise<UserChatJobRecord | null> {
    const { userId, agentPermanentId, chatId, jobId } = options;
    const userChatJobTable = await provideUserChatJobTable();

    const { data, error } = await userChatJobTable
        .select('*')
        .eq('id', jobId)
        .eq('chatId', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat job "${jobId}": ${error.message}`);
    }

    return data ? mapUserChatJobRow(data as UserChatJobRow) : null;
}
