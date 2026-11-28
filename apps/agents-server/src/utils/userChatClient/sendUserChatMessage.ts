'use client';

import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatEnqueueResult } from '../userChatClient';
import { requestUserChatApi } from './requestUserChatApi';

/**
 * Enqueues one user-authored message for durable server-side processing.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function sendUserChatMessage(
    agentName: string,
    chatId: string,
    payload: {
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
        threadId?: string;
        repliedToMessageId?: string;
    },
): Promise<UserChatEnqueueResult> {
    return await requestUserChatApi<UserChatEnqueueResult>(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/messages`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
        'Failed to send chat message.',
    );
}
