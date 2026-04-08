'use client';

import type { UserChatDetail } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Requests cancellation for one active durable chat timeout.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function cancelUserChatTimeout(
    agentName: string,
    chatId: string,
    timeoutId: string,
): Promise<UserChatDetail> {
    return await requestUserChatApi<UserChatDetail>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/timeouts/${encodeURIComponent(timeoutId)}/cancel`,
        {
            method: 'POST',
        },
        'Failed to cancel chat timeout.',
    );
}
