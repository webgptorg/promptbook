import type { ToolCall } from '@promptbook-local/types';
import { sendUserChatPushNotification } from '../sendUserChatPushNotification';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';
import { resolveMessageLifecycleStateFromJobStatus } from './userChatMessageLifecycle';

/**
 * Persists the final assistant-message state together with the durable job status.
 */
export async function persistUserChatJobTerminalState(options: {
    job: Pick<
        UserChatJobRecord,
        'id' | 'userId' | 'agentPermanentId' | 'chatId' | 'assistantMessageId'
    >;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    content?: string;
    toolCalls?: ReadonlyArray<ToolCall>;
    provider?: string | null;
    failureReason?: string | null;
    generationDurationMs?: number;
}): Promise<void> {
    const updatedChat = await updateUserChatAssistantMessage({
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
            generationDurationMs: options.generationDurationMs ?? message.generationDurationMs,
            progressCard: undefined,
        }),
    });

    await finalizeUserChatJob({
        jobId: options.job.id,
        status: options.status,
        provider: options.provider,
        failureReason: options.failureReason,
    });

    if (options.status === 'COMPLETED') {
        const completedMessage = updatedChat.messages.find((message) => message.id === options.job.assistantMessageId);

        if (completedMessage) {
            await sendUserChatPushNotification({
                chat: updatedChat,
                message: completedMessage,
            }).catch((error) => {
                console.error('[push-notification]', 'send_failed_post_persist', {
                    userId: updatedChat.userId,
                    chatId: updatedChat.id,
                    messageId: completedMessage.id,
                    error,
                });
            });
        }
    }
}
