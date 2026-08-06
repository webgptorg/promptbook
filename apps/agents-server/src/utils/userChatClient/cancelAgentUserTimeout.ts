'use client';

import type { UserChatTimeout } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Cancels one planned message of the agent from its goal chat.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function cancelAgentUserTimeout(agentName: string, timeoutId: string): Promise<UserChatTimeout> {
    return await requestUserChatApi<UserChatTimeout>(
        `/agents/${encodeURIComponent(agentName)}/api/timeouts/${encodeURIComponent(timeoutId)}`,
        {
            method: 'DELETE',
        },
        'Failed to cancel the planned message.',
    );
}
