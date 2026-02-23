import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
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
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { Agent, computeAgentHash } from '@promptbook-local/core';
import type {
    ChatMessage,
    ChatPrompt,
    LlmToolDefinition,
    string_book,
    TODO_any,
    UncertainNumber,
    Usage,
    UsageCounts,
} from '@promptbook-local/types';
import { $getCurrentDate } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import type OpenAI from 'openai';
import { computeUsageCounts } from '../../../../src/execution/utils/computeUsageCounts';
import { encodeChatStreamWhitespaceForTransport } from '../../../../src/utils/chat/constants';
import { isAgentDeleted } from '../app/agents/[agentName]/_utils';
import { HTTP_STATUS_CODES } from '../constants';
import { AgentKitCacheManager } from './cache/AgentKitCacheManager';
import { respondIfClientVersionIsOutdated } from './clientVersionGuard';
import { validateApiKey } from './validateApiKey';

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
            input: inputUsage,
            output: outputUsage,
        },
    };
}

type OpenAIChatToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool;

function convertOpenAiTools(rawTools: unknown): Array<LlmToolDefinition> | undefined {
    if (!Array.isArray(rawTools)) {
        return undefined;
    }

    const converted = rawTools
        .map((tool) => convertOpenAiTool(tool))
        .filter((tool): tool is LlmToolDefinition => tool !== null);

    return converted.length > 0 ? converted : undefined;
}

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

function parseOpenAiToolChoice(value: unknown): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return value as OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
}

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
        const body = await request.json();
        const {
            messages,
            stream,
            model,
            response_format: responseFormat,
            tools: rawTools,
            tool_choice: toolChoice,
            parameters: rawParameters = {},
        } = body;
        const runtimeTools = convertOpenAiTools(rawTools);
        const runtimeToolChoice = parseOpenAiToolChoice(toolChoice);

        const agentName = agentNameFromParams || model;
        const isPrivateModeEnabled = isPrivateModeEnabledFromRequest(request);

        if (!agentName) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Agent name is required. Please provide it in the URL or as the "model" parameter.',
                        type: 'invalid_request_error',
                    },
                },
                { status: HTTP_STATUS_CODES.BAD_REQUEST },
            );
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Messages array is required and cannot be empty.',
                        type: 'invalid_request_error',
                    },
                },
                { status: HTTP_STATUS_CODES.BAD_REQUEST },
            );
        }

        const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
        const deletedCheckAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

        // Check if agent is deleted
        if (await isAgentDeleted(deletedCheckAgentIdentifier)) {
            return NextResponse.json(
                {
                    error: {
                        message: 'This agent has been deleted. You can restore it from the Recycle Bin.',
                        type: 'agent_deleted',
                    },
                },
                { status: 410 }, // Gone - indicates the resource is no longer available
            );
        }

        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        let resolvedAgentContext: Awaited<ReturnType<typeof resolveBookScopedAgentContext>>;
        try {
            resolvedAgentContext = await resolveBookScopedAgentContext({
                collection,
                agentIdentifier: agentName,
                localServerUrl: new URL(request.url).origin,
                fallbackResolver: baseAgentReferenceResolver,
            });
        } catch (error) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: HTTP_STATUS_CODES.NOT_FOUND },
            );
        }
        let agentSource: string_book = resolvedAgentContext.resolvedAgentSource;

        if (!agentSource) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: HTTP_STATUS_CODES.NOT_FOUND },
            );
        }

        const messageSuffix = resolveMessageSuffixFromAgentSource(agentSource);

        // Note: Handle system messages as CONTEXT
        const systemMessages = messages.filter((msg: TODO_any) => msg.role === 'system');
        if (systemMessages.length > 0) {
            const contextString = systemMessages.map((msg: TODO_any) => `CONTEXT ${msg.content}`).join('\n');
            agentSource = `${agentSource}\n\n${contextString}` as string_book;
        }

        const threadMessages = messages.filter((msg: TODO_any) => msg.role !== 'system');

        if (threadMessages.length === 0) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Messages array must contain at least one non-system message.',
                        type: 'invalid_request_error',
                    },
                },
                { status: HTTP_STATUS_CODES.BAD_REQUEST },
            );
        }

        const agentHash = computeAgentHash(agentSource);
        const agentId = resolvedAgentContext.parentAgentPermanentId;
        const currentUserIdentity = await resolveCurrentUserMemoryIdentity();

        // Use AgentKitCacheManager for vector store caching
        const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
        const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();

        // Get or create AgentKit agent with enhanced caching
        // By default, includes full configuration (PERSONA + CONTEXT) in cache key for strict matching
        // Set includeDynamicContext: false to enable better caching by excluding CONTEXT from cache key
        const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
            agentSource,
            resolvedAgentContext.resolvedAgentName,
            baseOpenAiTools,
            {
                includeDynamicContext: true, // Default: strict caching (includes CONTEXT)
                agentId,
                agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
            },
        );

        if (agentKitResult.fromCache) {
            console.info('[🤰]', 'AgentKit cache hit (OpenAI)', {
                agentName,
                assistantCacheKey: agentKitResult.assistantCacheKey,
                vectorStoreHash: agentKitResult.vectorStoreHash,
                vectorStoreId: agentKitResult.vectorStoreId,
            });
        } else {
            console.info('[🤰]', 'AgentKit cache miss (OpenAI)', {
                agentName,
                assistantCacheKey: agentKitResult.assistantCacheKey,
                vectorStoreHash: agentKitResult.vectorStoreHash,
                vectorStoreId: agentKitResult.vectorStoreId,
            });
        }

        const agent = new Agent({
            agentSource,
            executionTools: {
                llm: agentKitResult.tools,
            },
            assistantPreparationMode: 'external',
            isVerbose: true, // or false
            teacherAgent: null, // <- TODO: [🦋] DRY place to provide the teacher
        });

        // Note: Capture timezone from request headers
        const timezone = request.headers.get('x-timezone') || 'UTC';

        // Prepare thread and content
        const lastMessage = threadMessages[threadMessages.length - 1];
        const previousMessages = threadMessages.slice(0, -1);

        const thread: ChatMessage[] = previousMessages.map((msg: TODO_any, index: number) => ({
            // channel: 'PROMPTBOOK_CHAT',
            id: `msg-${index}`, // Placeholder ID
            sender: msg.role === 'assistant' ? 'agent' : 'user', // Mapping standard OpenAI roles
            content: msg.content,
            isComplete: true,
            createdAt: $getCurrentDate(), // We don't have the real date, using current
        }));

        // Note: Identify the user message
        const userMessageContent = {
            role: 'USER',
            content: lastMessage.content,
        };
        const recordChatHistoryMessage = await createChatHistoryRecorder({
            request,
            agentIdentifier: agentId,
            agentHash,
            source: 'OPENAI_API_COMPATIBILITY',
            apiKey,
            isEnabled: !isPrivateModeEnabled,
        });
        const userMessageHash = await recordChatHistoryMessage({
            message: userMessageContent,
            previousMessageHash: null,
        });

        const incomingParameters =
            rawParameters && typeof rawParameters === 'object' && !Array.isArray(rawParameters)
                ? (rawParameters as Record<string, unknown>)
                : {};
        const promptParameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                ...incomingParameters,
                timezone,
            },
            currentUserIdentity,
            agentPermanentId: agentId,
            agentName: resolvedAgentContext.resolvedAgentName,
            isPrivateModeEnabled,
        });

        const prompt: ChatPrompt = {
            title,
            content: lastMessage.content,
            modelRequirements: {
                modelVariant: 'CHAT',
                responseFormat,
                toolChoice: runtimeToolChoice,
                // We could pass 'model' from body if we wanted to enforce it, but Agent usually has its own config
            },
            parameters: promptParameters,
            thread,
            ...(runtimeTools ? { tools: runtimeTools } : {}),
        };
        if (stream) {
            const encoder = new TextEncoder();
            const readableStream = new ReadableStream({
                async start(controller) {
                    const runId = `chatcmpl-${Math.random().toString(36).substring(2, 15)}`;
                    const created = Math.floor(Date.now() / 1000);

                    // Note: Send the initial chunk with role
                    const initialChunkData = {
                        id: runId,
                        object: 'chat.completion.chunk',
                        created,
                        model: model || 'promptbook-agent',
                        choices: [
                            {
                                index: 0,
                                delta: {
                                    role: 'assistant',
                                    content: '',
                                },
                                finish_reason: null,
                            },
                        ],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunkData)}\n\n`));

                    let hasMeaningfulDelta = false;

                    try {
                        const emitDeltaChunk = (deltaContent: string) => {
                            const chunkData = {
                                id: runId,
                                object: 'chat.completion.chunk',
                                created,
                                model: model || 'promptbook-agent',
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            content: encodeChatStreamWhitespaceForTransport(deltaContent),
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
                        };

                        const handleStreamChunk = createChatStreamHandler({
                            onDelta: (deltaContent) => {
                                if (deltaContent.trim().length > 0) {
                                    hasMeaningfulDelta = true;
                                }
                                emitDeltaChunk(deltaContent);
                            },
                            onToolCalls: (toolCalls) => {
                                controller.enqueue(encoder.encode('\n' + JSON.stringify({ toolCalls }) + '\n'));
                            },
                        });

                        const result = await agent.callChatModelStream(prompt, handleStreamChunk, {
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
                            messageSuffix,
                        );
                        if (messageSuffixAppendix) {
                            await emulateMessageSuffixStreaming(messageSuffixAppendix, (delta) => {
                                emitDeltaChunk(delta);
                            });
                        }

                        const responseContentWithSuffix = appendMessageSuffix(
                            normalizedResponse.content,
                            messageSuffix,
                        );

                        // Note: Identify the agent message
                        const agentMessageContent = {
                            role: 'MODEL',
                            content: responseContentWithSuffix,
                        };

                        await recordChatHistoryMessage({
                            message: agentMessageContent,
                            previousMessageHash: userMessageHash,
                        });

                        // Note: [🐱‍🚀] Save the learned data
                        const newAgentSource = agent.agentSource.value;
                        if (newAgentSource !== agentSource && !resolvedAgentContext.isBookScopedAgent) {
                            await collection.updateAgentSource(agentId, newAgentSource);
                        }

                        const doneChunkData = {
                            id: runId,
                            object: 'chat.completion.chunk',
                            created,
                            model: model || 'promptbook-agent',
                            choices: [
                                {
                                    index: 0,
                                    delta: {},
                                    finish_reason: 'stop',
                                },
                            ],
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunkData)}\n\n`));
                        controller.enqueue(encoder.encode('[DONE]'));
                    } catch (error) {
                        console.error('Error during streaming:', error);
                        // OpenAI stream doesn't usually send error JSON in stream, just closes or sends error text?
                        // But we should try to close gracefully or error.
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
        } else {
            const result = await agent.callChatModel(prompt);

            const normalizedResponse = ensureNonEmptyChatContent({
                content: result.content,
                context: title,
            });
            const responseContentWithSuffix = appendMessageSuffix(normalizedResponse.content, messageSuffix);

            // Note: Identify the agent message
            const agentMessageContent = {
                role: 'MODEL',
                content: responseContentWithSuffix,
            };

            await recordChatHistoryMessage({
                message: agentMessageContent,
                previousMessageHash: userMessageHash,
            });

            // Note: [🐱‍🚀] Save the learned data
            if (!isPrivateModeEnabled) {
                const newAgentSource = agent.agentSource.value;
                if (newAgentSource !== agentSource && !resolvedAgentContext.isBookScopedAgent) {
                    await collection.updateAgentSource(agentId, newAgentSource);
                }
            }

            return NextResponse.json({
                id: `chatcmpl-${Math.random().toString(36).substring(2, 15)}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model || 'promptbook-agent',
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
                usage: createCompatibilityUsage(prompt.content, responseContentWithSuffix, result.usage),
            });
        }
    } catch (error) {
        console.error(`Error in ${title} handler:`, error);
        return NextResponse.json(
            { error: { message: (error as Error).message || 'Internal Server Error', type: 'server_error' } },
            { status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR },
        );
    }
}

/**
 * TODO: [🈹] Maybe move chat thread handling here
 */
