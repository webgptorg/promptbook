'use client';

import type { FetchUserChatsOptions, UserChatsSnapshot } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Fetches chats for one agent and includes resolved active chat messages.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function fetchUserChats(
    agentName: string,
    chatId?: string,
    options: FetchUserChatsOptions = {},
): Promise<UserChatsSnapshot> {
    const query = new URLSearchParams();
    if (chatId) {
        query.set('chat', chatId);
    }
    if (options.showExternalChats) {
        query.set('showExternalChats', 'true');
    }

    const queryString = query.toString();

    return await requestUserChatApi<UserChatsSnapshot>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats${queryString ? `?${queryString}` : ''}`,
        {
            method: 'GET',
            cache: 'no-store',
        },
        'Failed to load chats.',
    );
}
