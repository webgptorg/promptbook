import type { ChatMessage } from '@promptbook-local/types';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import { createUserChatJob } from './createUserChatJob';
import { deleteUserChatJob } from './deleteUserChatJob';
import { mutateUserChat } from './mutateUserChat';
import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatRecord } from './UserChatRecord';
import {
    createQueuedUserChatAssistantMessage,
    createQueuedUserChatUserMessage,
} from './userChatMessageLifecycle';

/**
 * Length of generated durable message ids stored in canonical chat history.
 *
 * @private function of `userChat`
 */
const GENERATED_USER_CHAT_MESSAGE_ID_LENGTH = 14;

/**
 * Enqueues one canonical user turn and persists the linked durable job.
 */
export async function appendQueuedUserChatTurn(options: {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    clientMessageId: string;
    messageContent: string;
    attachments?: ChatMessage['attachments'];
    parameters?: Record<string, unknown>;
}): Promise<{
    chat: UserChatRecord;
    job: UserChatJobRecord;
}> {
    const nowIso = new Date().toISOString() as NonNullable<ChatMessage['createdAt']>;
    const userMessageId = $randomBase58(GENERATED_USER_CHAT_MESSAGE_ID_LENGTH);
    const assistantMessageId = $randomBase58(GENERATED_USER_CHAT_MESSAGE_ID_LENGTH);
    const jobId = $randomBase58(GENERATED_USER_CHAT_MESSAGE_ID_LENGTH);
    const job = await createUserChatJob({
        id: jobId,
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        userMessageId,
        assistantMessageId,
        clientMessageId: options.clientMessageId,
        parameters: options.parameters,
    });

    try {
        const chat = await mutateUserChat({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            mutate: (currentChat) => ({
                messages: [
                    ...currentChat.messages,
                    createQueuedUserChatUserMessage({
                        messageId: userMessageId,
                        clientMessageId: options.clientMessageId,
                        content: options.messageContent,
                        attachments: options.attachments,
                        createdAt: nowIso,
                    }),
                    createQueuedUserChatAssistantMessage({
                        messageId: assistantMessageId,
                        jobId,
                        createdAt: nowIso,
                    }),
                ],
                draftMessage: null,
                lastMessageAt: nowIso,
            }),
        });

        return { chat, job };
    } catch (error) {
        await deleteUserChatJob(jobId).catch((cleanupError) => {
            console.error('[user-chat] Failed to cleanup queued job after chat append failure', cleanupError);
        });
        throw error;
    }
}
