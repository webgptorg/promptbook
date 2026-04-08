'use client';

import type { FetchUserChatsOptions, UserChatDetail } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Loads a single chat detail by id.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function fetchUserChat(
    agentName: string,
    chatId: string,
    options: FetchUserChatsOptions = {},
): Promise<UserChatDetail> {
    const query = new URLSearchParams();
    if (options.showExternalChats) {
        query.set('showExternalChats', 'true');
    }

    return await requestUserChatApi<UserChatDetail>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}${
            query.size > 0 ? `?${query.toString()}` : ''
        }`,
        {
            method: 'GET',
            cache: 'no-store',
        },
        'Failed to load chat.',
    );
}
