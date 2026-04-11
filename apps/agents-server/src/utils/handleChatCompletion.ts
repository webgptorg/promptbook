import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    createBookScopedAgentReferenceResolver,
    parseBookScopedAgentIdentifier,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import {
    appendMessageSuffix,
    createMessageSuffixAppendix,
    emulateMessageSuffixStreaming,
    resolveMessageSuffixFromAgentSource,
} from '@/src/utils/chat/messageSuffix';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { prepareToolCallsForStreaming } from './toolCallStreaming';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { extractUseCalendarConnectionsFromAgentSource } from '@/src/utils/calendars/extractUseCalendarConnectionsFromAgentSource';
import { logCalendarToolCallsActivity } from '@/src/utils/calendars/logCalendarToolCallsActivity';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import { persistFrozenUserChat, USER_CHAT_SOURCES } from '@/src/utils/userChat';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { Agent, computeAgentHash } from '@promptbook-local/core';
import type {
    ChatMessage,
    ChatPrompt,
    LlmToolDefinition,
    string_book,
    ToolCall,
    TODO_any,
    UncertainNumber,
    Usage,
    UsageCounts,
} from '@promptbook-local/types';
import { $getCurrentDate } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import type OpenAI from 'openai';
import { computeUsageCounts } from '../../../../src/execution/utils/computeUsageCounts';
import { encodeChatStreamWhitespaceForTransport } from '../../../../src/utils/chat/encodeChatStreamWhitespaceForTransport';
import { isAgentDeleted } from '../app/agents/[agentName]/_utils';
import { HTTP_STATUS_CODES } from '../constants';
import { AgentKitCacheManager } from './cache/AgentKitCacheManager';
import { respondIfClientVersionIsOutdated } from './clientVersionGuard';
import { validateApiKey } from './validateApiKey';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from './agentPreparation';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from './cachedServerAgentRuntime';
import { resolveAppendOnlySelfLearningAgentSource } from './resolveAppendOnlySelfLearningAgentSource';

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

/**
 * Definition of open AI chat tool.
 */
type OpenAIChatToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool;

/**
 * Best-effort OpenAI-compatible message shape used for frozen audit snapshots.
 */
type OpenAiCompatibilityMessageLike = {
    role?: unknown;
    content?: unknown;
};

/**
 * Parsed OpenAI-compatible request payload used by `handleChatCompletion`.
 */
type HandleChatCompletionParsedRequest = {
    agentName: string;
    messages: ReadonlyArray<TODO_any>;
    threadMessages: ReadonlyArray<TODO_any>;
    stream: TODO_any;
    model: TODO_any;
    responseFormat: TODO_any;
    runtimeTools?: Array<LlmToolDefinition>;
    runtimeToolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
    incomingParameters: Record<string, unknown>;
    isPrivateModeEnabled: boolean;
};

/**
 * Runtime state resolved before the chat model is executed.
 */
type HandleChatCompletionRuntime = {
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    resolvedAgentContext: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>;
    agent: Agent;
    agentSource: string_book;
    unresolvedAgentSource: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['unresolvedAgentSource'];
    messageSuffix: string | null;
    agentId: string;
    agentHash: string;
    projectRepositories: ReturnType<typeof extractProjectRepositoriesFromAgentSource>;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    useEmailConfiguration: ReturnType<typeof extractUseEmailConfigurationFromAgentSource>;
    currentUserIdentity: Awaited<ReturnType<typeof resolveCurrentUserMemoryIdentity>>;
    projectGithubToken: Awaited<ReturnType<typeof resolveUseProjectGithubToken>>;
    calendarGoogleAccessToken: Awaited<ReturnType<typeof resolveUseCalendarGoogleToken>>;
    emailSmtpCredential: Awaited<ReturnType<typeof resolveUseEmailSmtpCredential>>;
    isPrivateModeEnabled: boolean;
};

/**
 * Prompt, history recorder, and persistence context created for one chat call.
 */
type HandleChatCompletionPromptContext = {
    prompt: ChatPrompt;
    userMessageHash: string;
    recordChatHistoryMessage: Awaited<ReturnType<typeof createChatHistoryRecorder>>;
    persistedFrozenChatId?: string;
};

/**
 * Handles convert open Ai tools.
 */
function convertOpenAiTools(rawTools: unknown): Array<LlmToolDefinition> | undefined {
    if (!Array.isArray(rawTools)) {
        return undefined;
    }

    const converted = rawTools
        .map((tool) => convertOpenAiTool(tool))
        .filter((tool): tool is LlmToolDefinition => tool !== null);

    return converted.length > 0 ? converted : undefined;
}

/**
 * Handles convert open Ai tool.
 */
function convertOpenAiTool(rawTool: unknown): LlmToolDefinition | null {
    const tool = rawTool as OpenAIChatToolDefinition;
    if (!tool || tool.type !== 'function') {
        return null;
    }

    const functionDefinition = tool.function;
    if (!functionDefinition) {
        return null;
    }

    const { name, description, parameters } = functionDefinition;
    if (typeof name !== 'string' || name.trim().length === 0) {
        return null;
    }

    const parameterSchema = parameters ?? {};
    if (parameterSchema.type !== 'object') {
        return null;
    }

    const properties = parameterSchema.properties ?? {};
    const normalizedProperties: Record<string, { type: string; description?: string }> = {};

    for (const [key, value] of Object.entries(properties)) {
        if (!value || typeof value !== 'object') {
            continue;
        }

        normalizedProperties[key] = {
            type: typeof value.type === 'string' ? value.type : 'string',
            description: typeof value.description === 'string' ? value.description : undefined,
        };
    }

    const required =
        Array.isArray(parameterSchema.required) && parameterSchema.required.length > 0
            ? parameterSchema.required.filter((item): item is string => typeof item === 'string')
            : undefined;

    return {
        name,
        description: typeof description === 'string' ? description : '',
        parameters: {
            type: 'object',
            properties: normalizedProperties,
            required,
            additionalProperties:
                typeof parameterSchema.additionalProperties === 'boolean'
                    ? parameterSchema.additionalProperties
                    : undefined,
        },
    };
}

/**
 * Parses open Ai tool choice.
 */
function parseOpenAiToolChoice(value: unknown): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return value as OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
}

/**
 * Converts arbitrary OpenAI-compatible message content into plain text for frozen chat replay.
 */
function normalizeOpenAiCompatibilityMessageContent(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map((part) => {
                if (typeof part === 'string') {
                    return part;
                }

                if (!part || typeof part !== 'object') {
                    return '';
                }

                const partLike = part as { type?: unknown; text?: unknown; image_url?: unknown };
                if (typeof partLike.text === 'string') {
                    return partLike.text;
                }

                if (typeof partLike.type === 'string' && partLike.type.toLowerCase().includes('image')) {
                    return '[Image input]';
                }

                if (partLike.image_url) {
                    return '[Image input]';
                }

                return '';
            })
            .filter(Boolean)
            .join('\n');
    }

    if (value === null || value === undefined) {
        return '';
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

/**
 * Maps OpenAI-compatible roles to Promptbook chat senders for frozen chat replay.
 */
function mapOpenAiCompatibilityRoleToSender(role: unknown): ChatMessage['sender'] {
    if (typeof role !== 'string') {
        return 'USER';
    }

    switch (role) {
        case 'assistant':
            return 'AGENT';
        case 'system':
            return 'SYSTEM';
        case 'tool':
            return 'TOOL';
        case 'developer':
            return 'SYSTEM';
        default:
            return 'USER';
    }
}

/**
 * Creates a frozen chat transcript from one OpenAI-compatible request snapshot.
 */
function createFrozenOpenAiCompatibilityMessages(
    rawMessages: ReadonlyArray<unknown>,
    assistantContent?: string,
    options: {
        includeAssistantPlaceholder?: boolean;
    } = {},
): Array<ChatMessage> {
    const startedAt = Date.now();
    const messages: Array<ChatMessage> = rawMessages.map((rawMessage, index) => {
        const message = rawMessage as OpenAiCompatibilityMessageLike;

        return {
            id: `openai-frozen-${index}`,
            sender: mapOpenAiCompatibilityRoleToSender(message.role),
            content: normalizeOpenAiCompatibilityMessageContent(message.content),
            isComplete: true,
            createdAt: new Date(startedAt + index).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage;
    });

    if (assistantContent !== undefined) {
        messages.push({
            id: `openai-frozen-${messages.length}`,
            sender: 'AGENT',
            content: assistantContent,
            isComplete: true,
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    } else if (options.includeAssistantPlaceholder) {
        messages.push({
            id: `openai-frozen-${messages.length}`,
            sender: 'AGENT',
            content: '',
            isComplete: false,
            lifecycleState: 'running',
            createdAt: new Date(startedAt + messages.length).toISOString() as NonNullable<ChatMessage['createdAt']>,
        } satisfies ChatMessage);
    }

    return messages;
}

/**
 * Handles chat completion.
 */
export async function handleChatCompletion(
    request: NextRequest,
    params: { agentName?: string },
    title: string = 'API Chat Completion',
) {
    const { agentName: agentNameFromParams } = params;

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'json', { mode: 'api' });
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    // Validate API key explicitly (in addition to middleware)
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.isValid) {
        return NextResponse.json(
            {
                error: {
                    message: apiKeyValidation.error || 'Invalid API key',
                    type: 'authentication_error',
                },
            },
            { status: HTTP_STATUS_CODES.UNAUTHORIZED },
        );
    }
    const apiKey = apiKeyValidation.token || null;

    try {
        const parsedRequest = parseHandleChatCompletionRequest({
            body: await request.json(),
            agentNameFromParams,
            request,
        });
        if (parsedRequest instanceof NextResponse) {
            return parsedRequest;
        }

        const runtime = await resolveHandleChatCompletionRuntime({
            request,
            agentName: parsedRequest.agentName,
            messages: parsedRequest.messages,
            isPrivateModeEnabled: parsedRequest.isPrivateModeEnabled,
        });
        if (runtime instanceof NextResponse) {
            return runtime;
        }

        const promptContext = await createHandleChatCompletionPromptContext({
            request,
            title,
            apiKey,
            parsedRequest,
            runtime,
        });

        return parsedRequest.stream
            ? createHandleChatCompletionStreamResponse({
                  request,
                  title,
                  parsedRequest,
                  runtime,
                  promptContext,
              })
            : createHandleChatCompletionJsonResponse({
                  title,
                  parsedRequest,
                  runtime,
                  promptContext,
              });
    } catch (error) {
        console.error(`Error in ${title} handler:`, error);
        return NextResponse.json(
            { error: { message: (error as Error).message || 'Internal Server Error', type: 'server_error' } },
            { status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR },
        );
    }
}

/**
 * Parses and validates the OpenAI-compatible request payload.
 */
function parseHandleChatCompletionRequest(options: {
    body: TODO_any;
    agentNameFromParams?: string;
    request: NextRequest;
}): HandleChatCompletionParsedRequest | NextResponse {
    const { body, agentNameFromParams, request } = options;
    const {
        messages,
        stream,
        model,
        response_format: responseFormat,
        tools: rawTools,
        tool_choice: toolChoice,
        parameters: rawParameters = {},
    } = body;
    const agentName = (agentNameFromParams || model) as string | undefined;
    if (!agentName) {
        return createHandleChatCompletionErrorResponse(
            'Agent name is required. Please provide it in the URL or as the "model" parameter.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return createHandleChatCompletionErrorResponse(
            'Messages array is required and cannot be empty.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    const threadMessages = messages.filter((message: TODO_any) => message.role !== 'system');
    if (threadMessages.length === 0) {
        return createHandleChatCompletionErrorResponse(
            'Messages array must contain at least one non-system message.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    return {
        agentName,
        messages,
        threadMessages,
        stream,
        model,
        responseFormat,
        runtimeTools: convertOpenAiTools(rawTools),
        runtimeToolChoice: parseOpenAiToolChoice(toolChoice),
        incomingParameters:
            rawParameters && typeof rawParameters === 'object' && !Array.isArray(rawParameters)
                ? (rawParameters as Record<string, unknown>)
                : {},
        isPrivateModeEnabled: isPrivateModeEnabledFromRequest(request),
    };
}

/**
 * Resolves agent/runtime dependencies needed before prompt execution.
 */
async function resolveHandleChatCompletionRuntime(options: {
    request: NextRequest;
    agentName: string;
    messages: ReadonlyArray<TODO_any>;
    isPrivateModeEnabled: boolean;
}): Promise<HandleChatCompletionRuntime | NextResponse> {
    const { request, agentName, messages, isPrivateModeEnabled } = options;
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const deletedCheckAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

    if (await isAgentDeleted(deletedCheckAgentIdentifier)) {
        return createHandleChatCompletionErrorResponse(
            'This agent has been deleted. You can restore it from the Recycle Bin.',
            'agent_deleted',
            410,
        );
    }

    const [collection, baseAgentReferenceResolver] = await Promise.all([
        $provideAgentCollectionForServer(),
        $provideAgentReferenceResolver(),
    ]);
    const localServerUrl = new URL(request.url).origin;
    const resolvedAgentContext = await resolveCachedServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    }).catch(() => null);

    if (!resolvedAgentContext?.resolvedAgentSource) {
        return createHandleChatCompletionErrorResponse(
            `Agent '${agentName}' not found.`,
            'invalid_request_error',
            HTTP_STATUS_CODES.NOT_FOUND,
        );
    }

    let agentSource: string_book = resolvedAgentContext.resolvedAgentSource;
    const unresolvedAgentSource = resolvedAgentContext.unresolvedAgentSource;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const calendarConnections = extractUseCalendarConnectionsFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const messageSuffix = resolveMessageSuffixFromAgentSource(agentSource);
    const { agentSourceWithContext, hasDynamicContext } = appendSystemMessagesToAgentSource(agentSource, messages);
    agentSource = agentSourceWithContext;

    const preparedAgentModelRequirements = !hasDynamicContext
        ? await resolveCachedServerAgentModelRequirements({
              resolvedAgentContext,
              localServerUrl,
              fallbackResolver: baseAgentReferenceResolver,
          })
        : null;
    const agentId = resolvedAgentContext.parentAgentPermanentId;
    const agentHash = computeAgentHash(agentSource);
    await waitForHandleChatCompletionAgentPreparation({
        collection,
        agentId,
        agentHash,
    });

    const currentUserIdentity = await resolveCurrentUserMemoryIdentity();
    const { projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential } =
        await resolveHandleChatCompletionCredentials({
            currentUserIdentity,
            agentId,
            calendarConnections,
            useEmailConfiguration,
        });
    const agent = await createHandleChatCompletionAgent({
        agentName,
        agentSource,
        agentId,
        resolvedAgentContext,
        localServerUrl,
        baseAgentReferenceResolver,
        hasDynamicContext,
        preparedAgentModelRequirements,
    });

    return {
        collection,
        resolvedAgentContext,
        agent,
        agentSource,
        unresolvedAgentSource,
        messageSuffix,
        agentId,
        agentHash,
        projectRepositories,
        calendarConnections,
        useEmailConfiguration,
        currentUserIdentity,
        projectGithubToken,
        calendarGoogleAccessToken,
        emailSmtpCredential,
        isPrivateModeEnabled,
    };
}

/**
 * Creates prompt and persistence helpers for one chat completion request.
 */
async function createHandleChatCompletionPromptContext(options: {
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
            // We could pass 'model' from body if we wanted to enforce it, but Agent usually has its own config
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
 * Handles the streaming OpenAI-compatible response branch.
 */
function createHandleChatCompletionStreamResponse(options: {
    request: NextRequest;
    title: string;
    parsedRequest: HandleChatCompletionParsedRequest;
    runtime: HandleChatCompletionRuntime;
    promptContext: HandleChatCompletionPromptContext;
}): Response {
    const { request, title, parsedRequest, runtime, promptContext } = options;
    const encoder = new TextEncoder();
    const responseModel = parsedRequest.model || 'promptbook-agent';
    const readableStream = new ReadableStream({
        async start(controller) {
            const runId = `chatcmpl-${Math.random().toString(36).substring(2, 15)}`;
            const created = Math.floor(Date.now() / 1000);
            const emitSsePayload = (payload: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };
            const emitDeltaChunk = (deltaContent: string) => {
                emitSsePayload(
                    createHandleChatCompletionChunk({
                        runId,
                        created,
                        model: responseModel,
                        delta: {
                            content: encodeChatStreamWhitespaceForTransport(deltaContent),
                        },
                        finishReason: null,
                    }),
                );
            };

            emitSsePayload(
                createHandleChatCompletionChunk({
                    runId,
                    created,
                    model: responseModel,
                    delta: {
                        role: 'assistant',
                        content: '',
                    },
                    finishReason: null,
                }),
            );

            let hasMeaningfulDelta = false;

            try {
                const handleStreamChunk = createChatStreamHandler({
                    onDelta: (deltaContent) => {
                        if (deltaContent.trim().length > 0) {
                            hasMeaningfulDelta = true;
                        }
                        emitDeltaChunk(deltaContent);
                    },
                    onToolCalls: (toolCalls) => {
                        const preparedToolCalls = prepareToolCallsForStreaming(toolCalls);
                        controller.enqueue(encoder.encode('\n' + JSON.stringify({ toolCalls: preparedToolCalls }) + '\n'));
                    },
                });
                const result = await runtime.agent.callChatModelStream(promptContext.prompt, handleStreamChunk, {
                    signal: request.signal,
                });
                const normalizedResponse = ensureNonEmptyChatContent({
                    content: result.content,
                    context: title,
                });

                if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                    emitDeltaChunk(normalizedResponse.content);
                }

                const messageSuffixAppendix = createMessageSuffixAppendix(
                    normalizedResponse.content,
                    runtime.messageSuffix,
                );
                if (messageSuffixAppendix) {
                    await emulateMessageSuffixStreaming(messageSuffixAppendix, (delta) => {
                        emitDeltaChunk(delta);
                    });
                }

                const responseContentWithSuffix = appendMessageSuffix(normalizedResponse.content, runtime.messageSuffix);
                await finalizeHandleChatCompletionResult({
                    responseContentWithSuffix,
                    usage: result.usage,
                    toolCalls: result.toolCalls,
                    parsedRequest,
                    runtime,
                    promptContext,
                    // Preserve historical behavior: streamed OpenAI-compatible calls still persist learning in private mode.
                    shouldPersistLearnedAgentSource: true,
                });

                emitSsePayload(
                    createHandleChatCompletionChunk({
                        runId,
                        created,
                        model: responseModel,
                        delta: {},
                        finishReason: 'stop',
                    }),
                );
                controller.enqueue(encoder.encode('[DONE]'));
            } catch (error) {
                console.error('Error during streaming:', error);
                controller.error(error);
            }
            controller.close();
        },
    });

    return new Response(readableStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}

/**
 * Handles the non-streaming OpenAI-compatible response branch.
 */
async function createHandleChatCompletionJsonResponse(options: {
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
 * Runs the shared side effects after one successful model response.
 */
async function finalizeHandleChatCompletionResult(options: {
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

/**
 * Persists one OpenAI-compatible frozen chat snapshot when the current request should store it.
 */
async function persistOpenAiCompatibilityFrozenChat(options: {
    isEnabled: boolean;
    userId: number | null | undefined;
    agentId: string;
    messages: ReadonlyArray<unknown>;
    chatId?: string;
    assistantContent?: string;
    includeAssistantPlaceholder?: boolean;
    failureMessage: string;
}): Promise<string | undefined> {
    const { isEnabled, userId, agentId, messages, chatId, assistantContent, includeAssistantPlaceholder, failureMessage } =
        options;
    if (!isEnabled || !userId) {
        return undefined;
    }

    const persistedFrozenChat = await persistFrozenUserChat({
        userId,
        agentPermanentId: agentId,
        source: USER_CHAT_SOURCES.OPENAI_API,
        chatId,
        messages: createFrozenOpenAiCompatibilityMessages(messages, assistantContent, {
            includeAssistantPlaceholder,
        }),
    }).catch((error) => {
        console.error(failureMessage, error);
        return null;
    });

    return persistedFrozenChat?.id;
}

/**
 * Builds one OpenAI-compatible thread from the earlier request messages.
 */
function createHandleChatCompletionThread(previousMessages: ReadonlyArray<TODO_any>): ChatMessage[] {
    return previousMessages.map((message: TODO_any, index: number) => ({
        id: `msg-${index}`,
        sender: message.role === 'assistant' ? 'agent' : 'user',
        content: message.content,
        isComplete: true,
        createdAt: $getCurrentDate(),
    }));
}

/**
 * Appends system messages to the agent source as dynamic `CONTEXT`.
 */
function appendSystemMessagesToAgentSource(
    agentSource: string_book,
    messages: ReadonlyArray<TODO_any>,
): {
    agentSourceWithContext: string_book;
    hasDynamicContext: boolean;
} {
    const systemMessages = messages.filter((message: TODO_any) => message.role === 'system');
    if (systemMessages.length === 0) {
        return {
            agentSourceWithContext: agentSource,
            hasDynamicContext: false,
        };
    }

    const contextString = systemMessages.map((message: TODO_any) => `CONTEXT ${message.content}`).join('\n');
    return {
        agentSourceWithContext: `${agentSource}\n\n${contextString}` as string_book,
        hasDynamicContext: true,
    };
}

/**
 * Waits for any running preparation job of the current agent before executing the chat call.
 */
async function waitForHandleChatCompletionAgentPreparation(options: {
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    agentId: string;
    agentHash: string;
}): Promise<void> {
    const tablePrefix = resolveAgentCollectionTablePrefix(options.collection);
    const preparationWaitResult = await waitForRunningAgentPreparation({
        tablePrefix,
        agentPermanentId: options.agentId,
        fingerprint: options.agentHash,
        timeoutMs: AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    });

    if (preparationWaitResult !== 'not_running') {
        console.info('[pre-index]', 'openai_chat_wait_result', {
            tablePrefix,
            agentPermanentId: options.agentId,
            agentHash: options.agentHash,
            preparationWaitResult,
        });
    }
}

/**
 * Resolves request-scoped project, calendar, and email credentials for the current agent.
 */
async function resolveHandleChatCompletionCredentials(options: {
    currentUserIdentity: Awaited<ReturnType<typeof resolveCurrentUserMemoryIdentity>>;
    agentId: string;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    useEmailConfiguration: ReturnType<typeof extractUseEmailConfigurationFromAgentSource>;
}): Promise<{
    projectGithubToken: Awaited<ReturnType<typeof resolveUseProjectGithubToken>>;
    calendarGoogleAccessToken: Awaited<ReturnType<typeof resolveUseCalendarGoogleToken>>;
    emailSmtpCredential: Awaited<ReturnType<typeof resolveUseEmailSmtpCredential>>;
}> {
    const userId = options.currentUserIdentity?.userId;
    const [projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential] = await Promise.all([
        resolveUseProjectGithubToken({
            userId,
            agentPermanentId: options.agentId,
        }),
        options.calendarConnections.length > 0
            ? resolveUseCalendarGoogleToken({
                  userId,
                  agentPermanentId: options.agentId,
              })
            : Promise.resolve(undefined),
        options.useEmailConfiguration.isEnabled
            ? resolveUseEmailSmtpCredential({
                  userId,
                  agentPermanentId: options.agentId,
              })
            : Promise.resolve(undefined),
    ]);

    return {
        projectGithubToken,
        calendarGoogleAccessToken,
        emailSmtpCredential,
    };
}

/**
 * Creates the request-scoped Promptbook agent that backs one compatibility chat call.
 */
async function createHandleChatCompletionAgent(options: {
    agentName: string;
    agentSource: string_book;
    agentId: string;
    resolvedAgentContext: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>;
    localServerUrl: string;
    baseAgentReferenceResolver: Awaited<ReturnType<typeof $provideAgentReferenceResolver>>;
    hasDynamicContext: boolean;
    preparedAgentModelRequirements: Awaited<ReturnType<typeof resolveCachedServerAgentModelRequirements>> | null;
}): Promise<Agent> {
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiToolsPromise = $provideOpenAiAgentKitExecutionToolsForServer();

    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
        options.agentSource,
        options.resolvedAgentContext.resolvedAgentName,
        await baseOpenAiToolsPromise,
        {
            includeDynamicContext: true,
            agentId: options.agentId,
            ...(options.hasDynamicContext
                ? {
                      agentReferenceResolver: createBookScopedAgentReferenceResolver({
                          parentAgentSource: options.resolvedAgentContext.parentAgentSource,
                          parentAgentIdentifier: options.resolvedAgentContext.parentAgentPermanentId,
                          localServerUrl: options.localServerUrl,
                          fallbackResolver: options.baseAgentReferenceResolver,
                      }),
                  }
                : {
                      modelRequirements: options.preparedAgentModelRequirements!.modelRequirements,
                  }),
        },
    );

    console.info('[🤰]', `AgentKit cache ${agentKitResult.fromCache ? 'hit' : 'miss'} (OpenAI)`, {
        agentName: options.agentName,
        assistantCacheKey: agentKitResult.assistantCacheKey,
        vectorStoreHash: agentKitResult.vectorStoreHash,
        vectorStoreId: agentKitResult.vectorStoreId,
    });

    return new Agent({
        agentSource: options.agentSource,
        executionTools: {
            llm: agentKitResult.tools,
        },
        assistantPreparationMode: 'external',
        isVerbose: true,
        teacherAgent: null,
    });
}

/**
 * Creates one OpenAI-compatible streaming chunk payload.
 */
function createHandleChatCompletionChunk(options: {
    runId: string;
    created: number;
    model: TODO_any;
    delta: Record<string, unknown>;
    finishReason: 'stop' | null;
}) {
    return {
        id: options.runId,
        object: 'chat.completion.chunk',
        created: options.created,
        model: options.model,
        choices: [
            {
                index: 0,
                delta: options.delta,
                finish_reason: options.finishReason,
            },
        ],
    };
}

/**
 * Creates one consistent OpenAI-compatible error response.
 */
function createHandleChatCompletionErrorResponse(message: string, type: string, status: number): NextResponse {
    return NextResponse.json(
        {
            error: {
                message,
                type,
            },
        },
        { status },
    );
}

// TODO: [🈹] Maybe move chat thread handling here
