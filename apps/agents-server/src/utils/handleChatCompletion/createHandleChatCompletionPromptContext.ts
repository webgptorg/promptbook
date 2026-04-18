import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import type { ChatMessage, ChatPrompt } from '@promptbook-local/types';
import { $getCurrentDate } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { persistOpenAiCompatibilityFrozenChat } from './persistOpenAiCompatibilityFrozenChat';
import type { HandleChatCompletionParsedRequest } from './parseHandleChatCompletionRequest';
import type { HandleChatCompletionRuntime } from './resolveHandleChatCompletionRuntime';

/**
 * Prompt, history recorder, and persistence context created for one chat call.
 *
 * @private type of `handleChatCompletion`
 */
export type HandleChatCompletionPromptContext = {
    prompt: ChatPrompt;
    userMessageHash: string;
    recordChatHistoryMessage: Awaited<ReturnType<typeof createChatHistoryRecorder>>;
    persistedFrozenChatId?: string;
};

/**
 * Creates prompt and persistence helpers for one chat completion request.
 *
 * @private function of `handleChatCompletion`
 */
export async function createHandleChatCompletionPromptContext(options: {
    request: NextRequest;
    title: string;
    apiKey: string | null;
    parsedRequest: HandleChatCompletionParsedRequest;
    runtime: HandleChatCompletionRuntime;
}): Promise<HandleChatCompletionPromptContext> {
    const { request, title, apiKey, parsedRequest, runtime } = options;
    const timezone = request.headers.get('x-timezone') || 'UTC';
    const lastMessage = parsedRequest.threadMessages[parsedRequest.threadMessages.length - 1];
    const thread = createHandleChatCompletionThread(parsedRequest.threadMessages.slice(0, -1));
    const recordChatHistoryMessage = await createChatHistoryRecorder({
        request,
        agentIdentifier: runtime.agentId,
        agentHash: runtime.agentHash,
        source: 'OPENAI_API_COMPATIBILITY',
        apiKey,
        userId: runtime.currentUserIdentity?.userId ?? null,
        isEnabled: !runtime.isPrivateModeEnabled,
    });
    const userMessageHash = await recordChatHistoryMessage({
        message: {
            role: 'USER',
            content: lastMessage.content,
        },
        previousMessageHash: null,
    });
    const promptParameters = composePromptParametersWithMemoryContext({
        baseParameters: {
            ...parsedRequest.incomingParameters,
            timezone,
        },
        currentUserIdentity: runtime.currentUserIdentity,
        agentPermanentId: runtime.agentId,
        agentName: runtime.resolvedAgentContext.resolvedAgentName,
        isPrivateModeEnabled: runtime.isPrivateModeEnabled,
        projectRepositories: runtime.projectRepositories,
        projectGithubToken: runtime.projectGithubToken,
        emailSmtpCredential: runtime.emailSmtpCredential,
        emailFromAddress: runtime.useEmailConfiguration.senderEmail,
        calendarGoogleAccessToken: runtime.calendarGoogleAccessToken,
        calendarConnections: runtime.calendarConnections,
    });
    const prompt: ChatPrompt = {
        title,
        content: lastMessage.content,
        modelRequirements: {
            modelVariant: 'CHAT',
            responseFormat: parsedRequest.responseFormat,
            toolChoice: parsedRequest.runtimeToolChoice,
        },
        parameters: promptParameters,
        thread,
        ...(parsedRequest.runtimeTools ? { tools: parsedRequest.runtimeTools } : {}),
    };

    return {
        prompt,
        userMessageHash,
        recordChatHistoryMessage,
        persistedFrozenChatId: await persistOpenAiCompatibilityFrozenChat({
            isEnabled: !runtime.isPrivateModeEnabled,
            userId: runtime.currentUserIdentity?.userId ?? null,
            agentId: runtime.agentId,
            messages: parsedRequest.messages,
            includeAssistantPlaceholder: true,
            failureMessage: '[user-chat] Failed to persist OpenAI-compatible frozen chat',
        }),
    };
}

/**
 * Builds one OpenAI-compatible thread from the earlier request messages.
 */
function createHandleChatCompletionThread(
    previousMessages: HandleChatCompletionParsedRequest['threadMessages'],
): Array<ChatMessage> {
    return previousMessages.map((message, index) => ({
        id: `msg-${index}`,
        sender: message.role === 'assistant' ? 'agent' : 'user',
        content: message.content,
        isComplete: true,
        createdAt: $getCurrentDate(),
    }));
}
