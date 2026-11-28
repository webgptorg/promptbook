import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import {
    appendMessageSuffix,
    createMessageSuffixAppendix,
    emulateMessageSuffixStreaming,
} from '@/src/utils/chat/messageSuffix';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { encodeChatStreamWhitespaceForTransport } from '../../../../../src/utils/chat/encodeChatStreamWhitespaceForTransport';
import { prepareToolCallsForStreaming } from '../toolCallStreaming';
import { finalizeHandleChatCompletionResult } from './finalizeHandleChatCompletionResult';
import type { HandleChatCompletionPromptContext } from './createHandleChatCompletionPromptContext';
import type { HandleChatCompletionParsedRequest } from './parseHandleChatCompletionRequest';
import type { HandleChatCompletionRuntime } from './resolveHandleChatCompletionRuntime';

/**
 * Handles the streaming OpenAI-compatible response branch.
 *
 * @private function of `handleChatCompletion`
 */
export function createHandleChatCompletionStreamResponse(options: {
    request: Request;
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
 * Creates one OpenAI-compatible streaming chunk payload.
 */
function createHandleChatCompletionChunk(options: {
    runId: string;
    created: number;
    model: HandleChatCompletionParsedRequest['model'];
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
