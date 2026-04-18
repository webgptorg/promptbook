import { logCalendarToolCallsActivity } from '@/src/utils/calendars/logCalendarToolCallsActivity';
import { resolveAppendOnlySelfLearningAgentSource } from '@/src/utils/resolveAppendOnlySelfLearningAgentSource';
import type { ToolCall, Usage } from '@promptbook-local/types';
import { persistOpenAiCompatibilityFrozenChat } from './persistOpenAiCompatibilityFrozenChat';
import type { HandleChatCompletionPromptContext } from './createHandleChatCompletionPromptContext';
import type { HandleChatCompletionParsedRequest } from './parseHandleChatCompletionRequest';
import type { HandleChatCompletionRuntime } from './resolveHandleChatCompletionRuntime';

/**
 * Runs the shared side effects after one successful model response.
 *
 * @private function of `handleChatCompletion`
 */
export async function finalizeHandleChatCompletionResult(options: {
    responseContentWithSuffix: string;
    usage: Usage;
    toolCalls?: ReadonlyArray<ToolCall>;
    parsedRequest: HandleChatCompletionParsedRequest;
    runtime: HandleChatCompletionRuntime;
    promptContext: HandleChatCompletionPromptContext;
    shouldPersistLearnedAgentSource: boolean;
}): Promise<void> {
    const { responseContentWithSuffix, usage, toolCalls, parsedRequest, runtime, promptContext } = options;

    await promptContext.recordChatHistoryMessage({
        message: {
            role: 'MODEL',
            content: responseContentWithSuffix,
        },
        previousMessageHash: promptContext.userMessageHash,
        usage,
    });

    if (toolCalls && toolCalls.length > 0) {
        await logCalendarToolCallsActivity({
            userId: runtime.currentUserIdentity?.userId ?? null,
            agentPermanentId: runtime.agentId,
            toolCalls,
        });
    }

    await persistOpenAiCompatibilityFrozenChat({
        isEnabled: !runtime.isPrivateModeEnabled,
        userId: runtime.currentUserIdentity?.userId ?? null,
        agentId: runtime.agentId,
        chatId: promptContext.persistedFrozenChatId,
        messages: parsedRequest.messages,
        assistantContent: responseContentWithSuffix,
        failureMessage: '[user-chat] Failed to refresh OpenAI-compatible frozen chat',
    });
    await persistHandleChatCompletionLearnedAgentSource({
        runtime,
        shouldPersistLearnedAgentSource: options.shouldPersistLearnedAgentSource,
    });
}

/**
 * Applies append-only self-learning updates when the current branch should persist them.
 */
async function persistHandleChatCompletionLearnedAgentSource(options: {
    runtime: HandleChatCompletionRuntime;
    shouldPersistLearnedAgentSource: boolean;
}): Promise<void> {
    const { runtime, shouldPersistLearnedAgentSource } = options;
    if (!shouldPersistLearnedAgentSource || runtime.resolvedAgentContext.isBookScopedAgent) {
        return;
    }

    const learnedAgentSource = resolveAppendOnlySelfLearningAgentSource({
        unresolvedAgentSourceBeforeLearning: runtime.unresolvedAgentSource,
        resolvedAgentSourceBeforeLearning: runtime.agentSource,
        resolvedAgentSourceAfterLearning: runtime.agent.agentSource.value,
    });

    if (learnedAgentSource !== null) {
        await runtime.collection.updateAgentSource(runtime.agentId, learnedAgentSource);
    }
}
