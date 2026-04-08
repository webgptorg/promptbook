'use client';

import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatDetail, UserChatSaveRequestOptions } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Replaces stored messages for one chat.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function saveUserChatMessages(
    agentName: string,
    chatId: string,
    messages: ReadonlyArray<ChatMessage>,
    options: UserChatSaveRequestOptions = {},
): Promise<UserChatDetail> {
    return await requestUserChatApi<UserChatDetail>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
            keepalive: options.keepalive,
        },
        'Failed to save chat.',
    );
}
