import type { ChatMessage, LlmToolDefinition, ToolCall } from '@promptbook-local/types';
import { sendUserChatPushNotification } from '../sendUserChatPushNotification';
import { sendEmailChatReply } from '../email/sendEmailChatReply';
import { recordUserChatMessageInChatHistory } from './recordUserChatMessageInChatHistory';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { isUserChatNotFoundScopeError } from './UserChatScopeError';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';
import { USER_CHAT_SOURCES } from './UserChatSource';
import { resolveMessageLifecycleStateFromJobStatus } from './userChatMessageLifecycle';

/**
 * Persists the final assistant-message state together with the durable job status.
 */
export async function persistUserChatJobTerminalState(options: {
    job: Pick<UserChatJobRecord, 'id' | 'userId' | 'agentPermanentId' | 'chatId' | 'assistantMessageId'>;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    content?: string;
    toolCalls?: ReadonlyArray<ToolCall>;
    prompt?: ChatMessage['prompt'];
    /**
     * Complete list of tools that were available to the model during this turn.
     *
     * Captured from the exact tool definitions passed to the LLM request so developers
     * can inspect what capabilities the model had access to via the message inspector.
     */
    availableTools?: ReadonlyArray<LlmToolDefinition>;
    provider?: string | null;
    failureReason?: string | null;
    failureDetails?: string | null;
    /**
     * Actual time at which an out-of-process runner finished this assistant message.
     */
    executedAt?: NonNullable<ChatMessage['createdAt']>;
    generationDurationMs?: number;
}): Promise<void> {
    let updatedChat: Awaited<ReturnType<typeof updateUserChatAssistantMessage>> | null = null;

    try {
        updatedChat = await updateUserChatAssistantMessage({
            userId: options.job.userId,
            agentPermanentId: options.job.agentPermanentId,
            chatId: options.job.chatId,
            assistantMessageId: options.job.assistantMessageId,
            mutateMessage: (message) => ({
                ...message,
                content: options.content ?? message.content,
                isComplete: true,
                lifecycleState: resolveMessageLifecycleStateFromJobStatus(options.status),
                lifecycleError: options.failureReason ?? undefined,
                ongoingToolCalls: undefined,
                toolCalls: options.toolCalls ?? message.toolCalls,
                completedToolCalls: options.toolCalls ?? message.completedToolCalls,
                createdAt: options.executedAt ?? message.createdAt,
                generationDurationMs: options.generationDurationMs ?? message.generationDurationMs,
                progressCard: undefined,
                availableTools: options.availableTools ?? message.availableTools,
                prompt: options.prompt ?? message.prompt,
            }),
        });
    } catch (error) {
        if (!isUserChatNotFoundScopeError(error)) {
            throw error;
        }
    }

    await finalizeUserChatJob({
        jobId: options.job.id,
        status: options.status,
        provider: options.provider,
        failureReason: options.failureReason,
        failureDetails: options.failureDetails,
    });

    if (options.status === 'COMPLETED' && updatedChat) {
        const completedChat = updatedChat;
        const completedMessage = completedChat.messages.find(
            (message) => message.id === options.job.assistantMessageId,
        );

        if (completedMessage) {
            // Note: Recording is best-effort telemetry for `/admin/chat-history` and must never block job completion
            void recordUserChatMessageInChatHistory({
                agentPermanentId: options.job.agentPermanentId,
                chatId: options.job.chatId,
                taskId: options.job.id,
                userId: options.job.userId,
                message: {
                    role: 'MODEL',
                    sender: 'MODEL',
                    content: typeof completedMessage.content === 'string' ? completedMessage.content : '',
                },
                source:
                    completedChat.source === USER_CHAT_SOURCES.EMAIL
                        ? 'EMAIL'
                        : 'AGENT_PAGE_CHAT',
                actorType:
                    completedChat.source === USER_CHAT_SOURCES.EMAIL
                        ? 'ANONYMOUS'
                        : 'TEAM_MEMBER',
            });

            await sendUserChatPushNotification({
                chat: completedChat,
                message: completedMessage,
            }).catch((error) => {
                console.error('[push-notification]', 'send_failed_post_persist', {
                    userId: completedChat.userId,
                    chatId: completedChat.id,
                    messageId: completedMessage.id,
                    error,
                });
            });

            if (completedChat.source === USER_CHAT_SOURCES.EMAIL) {
                await sendEmailChatReply({
                    jobId: options.job.id,
                    content: typeof completedMessage.content === 'string' ? completedMessage.content : '',
                }).catch((error) => {
                    console.error('[email-chat]', 'reply_failed_post_persist', {
                        userId: completedChat.userId,
                        chatId: completedChat.id,
                        messageId: completedMessage.id,
                        error,
                    });
                });
            }
        }
    }
}
