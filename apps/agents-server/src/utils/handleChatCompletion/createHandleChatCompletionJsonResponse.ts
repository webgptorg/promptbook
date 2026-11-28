import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { appendMessageSuffix } from '@/src/utils/chat/messageSuffix';
import type { UncertainNumber, Usage, UsageCounts } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { computeUsageCounts } from '../../../../../src/execution/utils/computeUsageCounts';
import { finalizeHandleChatCompletionResult } from './finalizeHandleChatCompletionResult';
import type { HandleChatCompletionPromptContext } from './createHandleChatCompletionPromptContext';
import type { HandleChatCompletionParsedRequest } from './parseHandleChatCompletionRequest';
import type { HandleChatCompletionRuntime } from './resolveHandleChatCompletionRuntime';

/**
 * Handles the non-streaming OpenAI-compatible response branch.
 *
 * @private function of `handleChatCompletion`
 */
export async function createHandleChatCompletionJsonResponse(options: {
    title: string;
    parsedRequest: HandleChatCompletionParsedRequest;
    runtime: HandleChatCompletionRuntime;
    promptContext: HandleChatCompletionPromptContext;
}): Promise<NextResponse> {
    const { title, parsedRequest, runtime, promptContext } = options;
    const result = await runtime.agent.callChatModel(promptContext.prompt);
    const normalizedResponse = ensureNonEmptyChatContent({
        content: result.content,
        context: title,
    });
    const responseContentWithSuffix = appendMessageSuffix(normalizedResponse.content, runtime.messageSuffix);

    await finalizeHandleChatCompletionResult({
        responseContentWithSuffix,
        usage: result.usage,
        toolCalls: result.toolCalls,
        parsedRequest,
        runtime,
        promptContext,
        shouldPersistLearnedAgentSource: !runtime.isPrivateModeEnabled,
    });

    return NextResponse.json({
        id: `chatcmpl-${Math.random().toString(36).substring(2, 15)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: parsedRequest.model || 'promptbook-agent',
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: responseContentWithSuffix,
                },
                finish_reason: 'stop',
            },
        ],
        usage: createCompatibilityUsage(promptContext.prompt.content, responseContentWithSuffix, result.usage),
    });
}

/**
 * Falls back to the estimated value when the original token count is unknown.
 *
 * @param tokenCount - Token count reported by the execution tools.
 * @param fallbackValue - Estimated token count based on text length.
 * @returns Token count to report in the OpenAI-compatible response.
 */
function ensureTokenCount(tokenCount: UncertainNumber, fallbackValue: number): UncertainNumber {
    if (tokenCount.value === 0 && tokenCount.isUncertain) {
        return {
            value: fallbackValue,
            isUncertain: true,
        };
    }

    return tokenCount;
}

/**
 * Creates OpenAI-compatible usage fields based on the agent usage and computed text statistics.
 *
 * @param promptContent - Prompt content used for the request.
 * @param completionContent - Assistant response content.
 * @param usage - Native Promptbook usage details.
 * @returns Usage payload for compatibility responses.
 */
function createCompatibilityUsage(
    promptContent: string,
    completionContent: string,
    usage: Usage,
): {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    details: Usage;
} {
    const promptCounts = computeUsageCounts(promptContent);
    const completionCounts = computeUsageCounts(completionContent);
    const inputUsage: UsageCounts = {
        tokensCount: ensureTokenCount(usage.input.tokensCount, promptCounts.wordsCount.value),
        ...promptCounts,
    };
    const outputUsage: UsageCounts = {
        tokensCount: ensureTokenCount(usage.output.tokensCount, completionCounts.wordsCount.value),
        ...completionCounts,
    };

    const promptTokens = inputUsage.tokensCount.value;
    const completionTokens = outputUsage.tokensCount.value;

    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        details: {
            price: usage.price,
            duration: usage.duration,
            input: inputUsage,
            output: outputUsage,
        },
    };
}
