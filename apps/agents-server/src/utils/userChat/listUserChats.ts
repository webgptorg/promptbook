import type { ListUserChatsOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Lists all user chats for one agent ordered by last activity.
 */
export async function listUserChats(options: ListUserChatsOptions): Promise<Array<UserChatRecord>> {
    const { userId, viewerIsAdmin, agentPermanentId, includeExternalChats = false } = options;
    const userChatTable = await provideUserChatTable();
    const shouldLoadExternalChats = viewerIsAdmin && includeExternalChats;
    const query = shouldLoadExternalChats
        ? userChatTable.select('*').eq('agentPermanentId', agentPermanentId)
        : userChatTable
              .select('*')
              .eq('userId', userId)
              .eq('agentPermanentId', agentPermanentId)
              .eq('source', USER_CHAT_SOURCES.WEB_UI);
    const { data, error } = await query
        .order('lastMessageAt', { ascending: false, nullsFirst: false })
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user chats: ${error.message}`);
    }

    const chats = ((data || []) as Array<UserChatRow>).map(mapUserChatRow);

    if (!shouldLoadExternalChats) {
        return chats;
    }

    return chats.filter((chat) =>
        chat.source === USER_CHAT_SOURCES.WEB_UI ? chat.userId === userId : true,
    );
}
