import type { ChatMessage, LlmToolDefinition, ToolCall } from '@promptbook-local/types';
import { sendUserChatPushNotification } from '../sendUserChatPushNotification';
import { extractUsedKnowledgeSourcesFromToolCalls } from './extractUsedKnowledgeSourcesFromToolCalls';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { isUserChatNotFoundScopeError } from './UserChatScopeError';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';
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
                usedSources: extractUsedKnowledgeSourcesFromToolCalls(options.toolCalls ?? message.toolCalls),
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
        }
    }
}
