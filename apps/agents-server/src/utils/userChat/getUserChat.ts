import type { GetUserChatOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Loads one user chat by id.
 */
export async function getUserChat(options: GetUserChatOptions): Promise<UserChatRecord | null> {
    const { userId, viewerIsAdmin = false, viewerIsSuperAdmin = false, agentPermanentId, chatId } = options;
    const userChatTable = await provideUserChatTable();

    const { data, error } = await userChatTable
        .select('*')
        .eq('id', chatId)
        .eq('agentPermanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat "${chatId}": ${error.message}`);
    }

    if (!data) {
        return null;
    }

    const chat = mapUserChatRow(data as UserChatRow);

    if (chat.source === USER_CHAT_SOURCES.WEB_UI) {
        if (chat.userId === userId) {
            return chat;
        }

        // Note: Super-admins may open other users' chats in a view-only mode
        return viewerIsSuperAdmin ? chat : null;
    }

    return viewerIsAdmin || viewerIsSuperAdmin ? chat : null;
}
