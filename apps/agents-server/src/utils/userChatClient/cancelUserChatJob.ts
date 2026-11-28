'use client';

import type { UserChatDetail } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Requests cancellation for one active durable chat job.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function cancelUserChatJob(agentName: string, chatId: string, jobId: string): Promise<UserChatDetail> {
    return await requestUserChatApi<UserChatDetail>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
        {
            method: 'POST',
        },
        'Failed to cancel chat job.',
    );
}
