'use client';

import { fetchUserChatApiResponse } from './fetchUserChatApiResponse';

/**
 * Deletes one chat by id.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function removeUserChat(agentName: string, chatId: string): Promise<void> {
    await fetchUserChatApiResponse(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`,
        {
            method: 'DELETE',
        },
        'Failed to delete chat.',
    );
}
