import type { GetUserChatOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';

/**
 * Loads one user chat by id.
 */
export async function getUserChat(options: GetUserChatOptions): Promise<UserChatRecord | null> {
    const { userId, agentPermanentId, chatId } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .select('*')
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat "${chatId}": ${error.message}`);
    }

    return data ? mapUserChatRow(data as UserChatRow) : null;
}
