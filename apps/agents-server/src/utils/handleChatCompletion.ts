import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAssistantExecutionToolsForServer } from '@/src/tools/$provideOpenAiAssistantExecutionToolsForServer';
import { Agent } from '@promptbook-local/core';
import { ChatMessage, ChatPromptResult, Prompt, TODO_any } from '@promptbook-local/types';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './validateApiKey';

export async function handleChatCompletion(
    request: NextRequest,
    params: { agentName: string },
    title: string = 'API Chat Completion',
) {
    const { agentName } = params;

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
            { status: 401 },
        );
    }

    try {
        const body = await request.json();
        const { messages, stream, model } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Messages array is required and cannot be empty.',
                        type: 'invalid_request_error',
                    },
                },
                { status: 400 },
            );
        }

        const collection = await $provideAgentCollectionForServer();
        let agentSource;
        try {
            agentSource = await collection.getAgentSource(agentName);
        } catch (error) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: 404 },
            );
        }

        if (!agentSource) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: 404 },
            );
        }

        const openAiAssistantExecutionTools = await $provideOpenAiAssistantExecutionToolsForServer();
        const agent = new Agent({
            agentSource,
            executionTools: {
                llm: openAiAssistantExecutionTools, // Note: Use the same OpenAI Assistant LLM tools as the chat route
            },
            isVerbose: true, // or false
        });

        // Prepare thread and content
        const lastMessage = messages[messages.length - 1];
        const previousMessages = messages.slice(0, -1);

        const thread: ChatMessage[] = previousMessages.map((msg: TODO_any, index: number) => ({
            id: `msg-${index}`, // Placeholder ID
            from: msg.role === 'assistant' ? 'agent' : 'user', // Mapping standard OpenAI roles
            content: msg.content,
            isComplete: true,
            date: new Date(), // We don't have the real date, using current
        }));

        const prompt: Prompt = {
            title,
            content: lastMessage.content,
            modelRequirements: {
                modelVariant: 'CHAT',
                // We could pass 'model' from body if we wanted to enforce it, but Agent usually has its own config
            },
            parameters: {},
            thread,
        } as Prompt;
        // Note: Casting as Prompt because the type definition might require properties we don't strictly use or that are optional but TS complains

        if (stream) {
            const encoder = new TextEncoder();
            const readableStream = new ReadableStream({
                async start(controller) {
                    const runId = `chatcmpl-${Math.random().toString(36).substring(2, 15)}`;
                    const created = Math.floor(Date.now() / 1000);

                    let previousContent = '';

                    try {
                        await agent.callChatModelStream(prompt, (chunk: ChatPromptResult) => {
                            const fullContent = chunk.content;
                            const deltaContent = fullContent.substring(previousContent.length);
                            previousContent = fullContent;

                            if (deltaContent) {
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
                            }
                        });

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
                            content: result.content,
                        },
                        finish_reason: 'stop',
                    },
                ],
                usage: {
                    prompt_tokens: result.usage?.input?.tokensCount?.value || 0,
                    completion_tokens: result.usage?.output?.tokensCount?.value || 0,
                    total_tokens:
                        (result.usage?.input?.tokensCount?.value || 0) +
                        (result.usage?.output?.tokensCount?.value || 0),
                },
            });
        }
    } catch (error) {
        console.error(`Error in ${title} handler:`, error);
        return NextResponse.json(
            { error: { message: (error as Error).message || 'Internal Server Error', type: 'server_error' } },
            { status: 500 },
        );
    }
}

/**
 * TODO: !!!! Same self-learning as in web version
 * TODO: [🈹] Maybe move chat thread handling here
 */
