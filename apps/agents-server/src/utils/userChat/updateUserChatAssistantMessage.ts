import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatRecord } from './UserChatRecord';
import { mutateUserChat } from './mutateUserChat';
import { updateAssistantMessageInChat } from './userChatMessageLifecycle';

/**
 * Applies one mutation to the assistant message linked to a durable chat job.
 */
export async function updateUserChatAssistantMessage(options: {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    assistantMessageId: string;
    mutateMessage: (message: ChatMessage) => ChatMessage;
    lastMessageAt?: string | null;
    chatTitle?: string | null;
}): Promise<UserChatRecord> {
    return mutateUserChat({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        mutate: (currentChat) => ({
            messages: updateAssistantMessageInChat(
                currentChat.messages,
                options.assistantMessageId,
                options.mutateMessage,
            ),
            ...(options.lastMessageAt !== undefined ? { lastMessageAt: options.lastMessageAt } : {}),
            ...(options.chatTitle !== undefined ? { title: options.chatTitle } : {}),
        }),
    });
}
