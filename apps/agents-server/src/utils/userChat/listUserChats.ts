import type { ListUserChatsOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';

/**
 * Lists all user chats for one agent ordered by last activity.
 */
export async function listUserChats(options: ListUserChatsOptions): Promise<Array<UserChatRecord>> {
    const { userId, agentPermanentId } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .select('*')
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .order('lastMessageAt', { ascending: false, nullsFirst: false })
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user chats: ${error.message}`);
    }

    return ((data || []) as Array<UserChatRow>).map(mapUserChatRow);
}
