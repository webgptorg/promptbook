import type { ToolCall } from '@promptbook-local/types';
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
    await updateUserChatAssistantMessage({
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
        }),
    });

    await finalizeUserChatJob({
        jobId: options.job.id,
        status: options.status,
        provider: options.provider,
        failureReason: options.failureReason,
    });
}
