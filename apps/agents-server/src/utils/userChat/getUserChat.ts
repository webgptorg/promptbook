import type { GetUserChatOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Loads one user chat by id.
 */
export async function getUserChat(options: GetUserChatOptions): Promise<UserChatRecord | null> {
    const {
        userId,
        viewerIsAdmin = false,
        viewerIsSuperAdmin = false,
        viewerCanAccessAgentGoalChat = false,
        agentPermanentId,
        chatId,
    } = options;
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

    if (chat.source === USER_CHAT_SOURCES.AGENT_GOAL) {
        // Note: Goal chats follow agent-source-book access, and stay readable for the background
        //       workers that run under the goal chat's own owner identity
        return viewerCanAccessAgentGoalChat || viewerIsAdmin || viewerIsSuperAdmin || chat.userId === userId
            ? chat
            : null;
    }

    return viewerIsAdmin || viewerIsSuperAdmin ? chat : null;
}
