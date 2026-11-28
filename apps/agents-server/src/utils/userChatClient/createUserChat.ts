'use client';

import type { UserChatDetail } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Creates a new empty chat for one agent.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function createUserChat(agentName: string): Promise<UserChatDetail> {
    return await requestUserChatApi<UserChatDetail>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        },
        'Failed to create chat.',
    );
}
