'use client';

import type { UserChatSaveRequestOptions } from '../userChatClient';
import { fetchUserChatApiResponse } from './fetchUserChatApiResponse';

/**
 * Saves the draft message for one chat without modifying messages.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function saveUserChatDraft(
    agentName: string,
    chatId: string,
    draftMessage: string | null,
    options: UserChatSaveRequestOptions = {},
): Promise<void> {
    await fetchUserChatApiResponse(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/draft`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftMessage }),
            keepalive: options.keepalive,
        },
        'Failed to save chat draft.',
    );
}
