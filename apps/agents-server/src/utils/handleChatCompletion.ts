import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { Agent, computeAgentHash, PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import type { Usage } from '@promptbook-local/types';
import { ChatMessage, Prompt, string_book, TODO_any } from '@promptbook-local/types';
import { $getCurrentDate, computeHash, countWords } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { isAgentDeleted } from '../app/agents/[agentName]/_utils';
import { HTTP_STATUS_CODES } from '../constants';
import { AssistantCacheManager } from './cache/AssistantCacheManager';
import { validateApiKey } from './validateApiKey';

/**
 * Creates OpenAI-compatible usage fields based on word counts.
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
    const promptWords = countWords(promptContent);
    const completionWords = countWords(completionContent);

    return {
        prompt_tokens: promptWords,
        completion_tokens: completionWords,
        total_tokens: promptWords + completionWords,
        details: usage,
    };
}

export async function handleChatCompletion(
    request: NextRequest,
    params: { agentName?: string },
    title: string = 'API Chat Completion',
) {
    const { agentName: agentNameFromParams } = params;

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
        const { messages, stream, model } = body;

        const agentName = agentNameFromParams || model;

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

        // Check if agent is deleted
        if (await isAgentDeleted(agentName)) {
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
        let agentSource: string_book;
        try {
            agentSource = await collection.getAgentSource(agentName);
        } catch (error) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: HTTP_STATUS_CODES.NOT_FOUND },
            );
        }

        if (!agentSource) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: HTTP_STATUS_CODES.NOT_FOUND },
            );
        }

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
        const agentId = await collection.getAgentPermanentId(agentName);

        // Use AssistantCacheManager for intelligent AgentKit caching
        // This provides a centralized, DRY way to manage vector store lifecycle
        const assistantCacheManager = new AssistantCacheManager({ isVerbose: true });
        const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();

        // Get or create assistant with enhanced caching
        // By default, includes full configuration (PERSONA + CONTEXT) in cache key for strict matching
        // Set includeDynamicContext: false to enable better caching by excluding CONTEXT from cache key
        const assistantResult = await assistantCacheManager.getOrCreateAssistant(
            agentSource,
            agentName,
            baseOpenAiTools,
            {
                includeDynamicContext: true, // Default: strict caching (includes CONTEXT)
                agentId,
            },
        );

        const vectorStoreId = assistantResult.tools.vectorStoreId;

        if (assistantResult.fromCache) {
            console.info('[🤰]', 'AgentKit cache hit (OpenAI)', {
                agentName,
                cacheKey: assistantResult.cacheKey,
                agentId: assistantResult.tools.agentId,
                vectorStoreId,
            });
        } else {
            console.info('[🤰]', 'AgentKit cache miss (OpenAI)', {
                agentName,
                cacheKey: assistantResult.cacheKey,
                agentId: assistantResult.tools.agentId,
                vectorStoreId,
            });
        }

        const agent = new Agent({
            agentSource,
            executionTools: {
                llm: assistantResult.tools,
            },
            assistantPreparationMode: 'external',
            isVerbose: true, // or false
            teacherAgent: null, // <- TODO: [🦋] DRY place to provide the teacher
        });

        const userAgent = request.headers.get('user-agent');
        const ip =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            request.headers.get('x-client-ip');

        // Note: Capture timezone, language and platform information
        const timezone = request.headers.get('x-timezone') || undefined;
        const language = request.headers.get('accept-language');
        // Simple platform extraction from userAgent parentheses content (e.g., Windows NT 10.0; Win64; x64)
        const platform = userAgent ? userAgent.match(/\(([^)]+)\)/)?.[1] : undefined; // <- TODO: [🧠] Improve platform parsing

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

        await $provideSupabaseForServer()
            .from(await $getTableName('ChatHistory'))
            .insert({
                createdAt: new Date().toISOString(),
                messageHash: computeHash(userMessageContent),
                previousMessageHash: null,
                agentName,
                agentHash,
                message: userMessageContent,
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                url: request.url,
                ip,
                userAgent,
                language,
                platform,
                source: 'OPENAI_API_COMPATIBILITY',
                apiKey,
            });

        const prompt: Prompt = {
            title,
            content: lastMessage.content,
            modelRequirements: {
                modelVariant: 'CHAT',
                // We could pass 'model' from body if we wanted to enforce it, but Agent usually has its own config
            },
            parameters: {
                timezone,
            },
            thread,
        } as Prompt;
        // Note: Casting as Prompt because the type definition might require properties we don't strictly use or that are optional but TS complains

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
                        const handleStreamChunk = createChatStreamHandler({
                            onDelta: (deltaContent) => {
                                if (deltaContent.trim().length > 0) {
                                    hasMeaningfulDelta = true;
                                }
                                const chunkData = {
                                    id: runId,
                                    object: 'chat.completion.chunk',
                                    created,
                                    model: model || 'promptbook-agent',
                                    choices: [
                                        {
                                            index: 0,
                                            delta: {
                                                content: deltaContent,
                                            },
                                            finish_reason: null,
                                        },
                                    ],
                                };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
                            },
                            onToolCalls: (toolCalls) => {
                                controller.enqueue(encoder.encode('\n' + JSON.stringify({ toolCalls }) + '\n'));
                            },
                        });

                        const result = await agent.callChatModelStream(prompt, handleStreamChunk);

                        const normalizedResponse = ensureNonEmptyChatContent({
                            content: result.content,
                            context: title,
                        });

                        if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                            const fallbackChunkData = {
                                id: runId,
                                object: 'chat.completion.chunk',
                                created,
                                model: model || 'promptbook-agent',
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            content: normalizedResponse.content,
                                        },
                                        finish_reason: null,
                                    },
                                ],
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackChunkData)}\n\n`));
                        }

                        // Note: Identify the agent message
                        const agentMessageContent = {
                            role: 'MODEL',
                            content: normalizedResponse.content,
                        };

                        // Record the agent message
                        await $provideSupabaseForServer()
                            .from(await $getTableName('ChatHistory'))
                            .insert({
                                createdAt: new Date().toISOString(),
                                messageHash: computeHash(agentMessageContent),
                                previousMessageHash: computeHash(userMessageContent),
                                agentName,
                                agentHash,
                                message: agentMessageContent,
                                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                                url: request.url,
                                ip,
                                userAgent,
                                language,
                                platform,
                                source: 'OPENAI_API_COMPATIBILITY',
                                apiKey,
                            });

                        // Note: [🐱‍🚀] Save the learned data
                        const newAgentSource = agent.agentSource.value;
                        if (newAgentSource !== agentSource) {
                            await collection.updateAgentSource(agentName, newAgentSource);
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

            // Note: Identify the agent message
            const agentMessageContent = {
                role: 'MODEL',
                content: normalizedResponse.content,
            };

            // Record the agent message
            await $provideSupabaseForServer()
                .from(await $getTableName('ChatHistory'))
                .insert({
                    createdAt: new Date().toISOString(),
                    messageHash: computeHash(agentMessageContent),
                    previousMessageHash: computeHash(userMessageContent),
                    agentName,
                    agentHash,
                    message: agentMessageContent,
                    promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                    url: request.url,
                    ip,
                    userAgent,
                    language,
                    platform,
                    source: 'OPENAI_API_COMPATIBILITY',
                    apiKey,
                });

            // Note: [🐱‍🚀] Save the learned data
            const newAgentSource = agent.agentSource.value;
            if (newAgentSource !== agentSource) {
                await collection.updateAgentSource(agentName, newAgentSource);
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
                            content: normalizedResponse.content,
                        },
                        finish_reason: 'stop',
                    },
                ],
                usage: createCompatibilityUsage(prompt.content, normalizedResponse.content, result.usage),
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



