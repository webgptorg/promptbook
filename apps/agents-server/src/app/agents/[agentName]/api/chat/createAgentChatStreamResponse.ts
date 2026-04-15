import type { ToolCall } from '@promptbook-local/types';
import { Agent } from '@promptbook-local/core';
import { $getCurrentDate } from '@promptbook-local/utils';
import { CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS, CHAT_STREAM_KEEP_ALIVE_TOKEN } from '@/src/constants/streaming';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import {
    appendMessageSuffix,
    createMessageSuffixAppendix,
    emulateMessageSuffixStreaming,
} from '@/src/utils/chat/messageSuffix';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { logCalendarToolCallsActivity } from '@/src/utils/calendars/logCalendarToolCallsActivity';
import { getTeacherRemoteAgent } from '@/src/utils/getTeacherRemoteAgent';
import { resolveAppendOnlySelfLearningAgentSource } from '@/src/utils/resolveAppendOnlySelfLearningAgentSource';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../../../../src/types/ToolCall';
import { encodeChatStreamWhitespaceForTransport } from '../../../../../../../../src/utils/chat/encodeChatStreamWhitespaceForTransport';
import { prepareToolCallsForStreaming } from '../../../../../utils/toolCallStreaming';
import type { ResolvedAgentChatRouteContext } from './resolveAgentChatRouteContext';

/**
 * Error name used when a chat stream is cancelled by the client.
 */
const CHAT_STREAM_ABORTED_ERROR_NAME = 'ChatStreamAbortedError';

/**
 * Builds a preparation tool call payload for the chat stream.
 */
function createAssistantPreparationToolCall(phase: string): ToolCall {
    return {
        name: ASSISTANT_PREPARATION_TOOL_CALL_NAME,
        arguments: { phase },
        createdAt: $getCurrentDate(),
    };
}

/**
 * Wraps tool calls in the NDJSON transport envelope consumed by `RemoteAgent`.
 */
function createToolCallsStreamFrame(toolCalls: ReadonlyArray<ToolCall>): string {
    return `\n${JSON.stringify({ toolCalls })}\n`;
}

/**
 * Creates a normalized cancellation error for chat streaming.
 */
function createChatStreamAbortedError(): Error {
    const error = new Error('Chat stream aborted by the client.');
    error.name = CHAT_STREAM_ABORTED_ERROR_NAME;
    return error;
}

/**
 * Detects runtime abort errors thrown by web streams or fetch when the client disconnects.
 */
function isAbortLikeError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const errorLike = error as { name?: unknown };
    return errorLike.name === 'AbortError';
}

/**
 * Detects whether a stream failure was caused by client-side cancellation.
 */
function isChatStreamCancellationError(error: unknown, signal: AbortSignal): boolean {
    if (signal.aborted) {
        return true;
    }

    if (!error || typeof error !== 'object') {
        return false;
    }

    const errorLike = error as { name?: unknown };
    return errorLike.name === CHAT_STREAM_ABORTED_ERROR_NAME || isAbortLikeError(error);
}

/**
 * Creates the markdown response stream used by the stateless agent chat route.
 *
 * @private function of POST
 */
export function createAgentChatStreamResponse(options: {
    request: Request;
    context: ResolvedAgentChatRouteContext;
}): Response {
    const readableStream = createAgentChatReadableStream(options);

    return new Response(readableStream, {
        status: 200,
        headers: {
            'Content-Type': 'text/markdown',
            'Access-Control-Allow-Origin': '*', // <- Note: Allow embedding on other websites
        },
    });
}

/**
 * Creates the low-level readable stream that emits markdown deltas, keep-alives, and tool-call frames.
 */
function createAgentChatReadableStream(options: {
    request: Request;
    context: ResolvedAgentChatRouteContext;
}): ReadableStream<Uint8Array> {
    const { request, context } = options;
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let hasMeaningfulDelta = false;
            let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
            let lastToolCallsFrame: string | null = null;
            let isStreamClosed = false;

            /**
             * Clears keep-alive timers and prevents additional writes to the response stream.
             */
            const markStreamClosed = (): void => {
                if (isStreamClosed) {
                    return;
                }

                isStreamClosed = true;

                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = undefined;
                }
            };

            /**
             * Returns true when streaming should stop due to closed connection or aborted request.
             */
            const isStreamCancelled = (): boolean => {
                return isStreamClosed || request.signal.aborted;
            };

            /**
             * Enqueues one markdown chunk while normalizing client disconnects to cancellation errors.
             */
            const enqueueChunk = (chunk: string): void => {
                if (isStreamCancelled()) {
                    throw createChatStreamAbortedError();
                }

                try {
                    controller.enqueue(encoder.encode(chunk));
                } catch (error) {
                    if (isAbortLikeError(error) || request.signal.aborted) {
                        markStreamClosed();
                        throw createChatStreamAbortedError();
                    }
                    throw error;
                }
            };

            const sendTextChunk = (chunk: string): void => {
                if (!chunk) {
                    return;
                }

                enqueueChunk(encodeChatStreamWhitespaceForTransport(chunk));
            };

            /**
             * Closes the outgoing stream once when still writable.
             */
            const closeStream = (): void => {
                if (isStreamClosed) {
                    return;
                }

                markStreamClosed();
                try {
                    controller.close();
                } catch {
                    // Stream may already be closed by the runtime when client disconnects.
                }
            };

            /**
             * Tracks request aborts so long-running model execution can stop quickly.
             */
            const handleRequestAbort = (): void => {
                markStreamClosed();
            };

            request.signal.addEventListener('abort', handleRequestAbort, { once: true });

            const emitToolCalls = (toolCalls: ReadonlyArray<ToolCall> | undefined): void => {
                if (!toolCalls || toolCalls.length === 0) {
                    return;
                }

                const preparedToolCalls = prepareToolCallsForStreaming(toolCalls);
                const frame = createToolCallsStreamFrame(preparedToolCalls);
                if (frame === lastToolCallsFrame) {
                    return;
                }

                lastToolCallsFrame = frame;
                enqueueChunk(frame);
            };

            const sendKeepAlivePing = () => {
                try {
                    enqueueChunk(`\n${CHAT_STREAM_KEEP_ALIVE_TOKEN}\n`);
                } catch (error) {
                    if (isChatStreamCancellationError(error, request.signal)) {
                        markStreamClosed();
                        return;
                    }

                    console.error('[Agent chat stream] Keep-alive failed', error);
                    markStreamClosed();
                }
            };

            if (isStreamCancelled()) {
                return;
            }

            sendKeepAlivePing();
            keepAliveInterval = setInterval(sendKeepAlivePing, CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS);

            /**
             * Note: Tool calls are emitted continuously while streaming and once more at the end.
             * The shared emitter deduplicates snapshots so ongoing and final chips stay consistent.
             */
            const handleStreamChunk = createChatStreamHandler({
                onDelta: (deltaContent) => {
                    if (deltaContent.trim().length > 0) {
                        hasMeaningfulDelta = true;
                    }
                    sendTextChunk(deltaContent);
                },
                onToolCalls: (toolCalls) => {
                    emitToolCalls(toolCalls);
                },
            });

            try {
                const agentKitResult = await context.agentKitCacheManager.getOrCreateAgentKitAgent(
                    context.agentSource,
                    context.resolvedAgentName,
                    await context.baseOpenAiToolsPromise,
                    {
                        includeDynamicContext: true,
                        agentId: context.agentId,
                        modelRequirements: context.modelRequirements,
                        onCacheMiss: async () => {
                            const toolCall = createAssistantPreparationToolCall('Preparing AgentKit agent');
                            emitToolCalls([toolCall]);
                        },
                    },
                );

                const agent = new Agent({
                    isVerbose: true, // <- TODO: [🐱‍🚀] From environment variable
                    assistantPreparationMode: 'external',
                    executionTools: {
                        llm: agentKitResult.tools,
                    },
                    agentSource: context.agentSource,
                    precomputedModelRequirements: context.modelRequirements,
                    teacherAgent: await getTeacherRemoteAgent(), // <- [🦋]
                });

                const response = await agent.callChatModelStream!(
                    {
                        title: `Chat with agent ${
                            context.resolvedAgentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                        }`,
                        parameters: context.promptParameters,
                        modelRequirements: {
                            modelVariant: 'CHAT',
                        },
                        content: context.message,
                        thread: context.thread,
                        attachments: context.attachments,
                        ...(context.runtimeTools.length > 0 ? { tools: context.runtimeTools } : {}),
                    },
                    handleStreamChunk,
                    { signal: request.signal },
                );

                if (isStreamCancelled()) {
                    throw createChatStreamAbortedError();
                }

                const normalizedResponse = ensureNonEmptyChatContent({
                    content: response.content,
                    context: `Agent chat ${context.resolvedAgentName}`,
                });

                if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                    sendTextChunk(normalizedResponse.content);
                }

                const messageSuffixAppendix = createMessageSuffixAppendix(
                    normalizedResponse.content,
                    context.messageSuffix,
                );
                if (messageSuffixAppendix) {
                    await emulateMessageSuffixStreaming(messageSuffixAppendix, (delta) => {
                        sendTextChunk(delta);
                    });
                }

                if (isStreamCancelled()) {
                    throw createChatStreamAbortedError();
                }

                const responseContentWithSuffix = appendMessageSuffix(
                    normalizedResponse.content,
                    context.messageSuffix,
                );
                await context.recordChatHistoryMessage({
                    message: {
                        role: 'MODEL',
                        sender: 'MODEL',
                        content: responseContentWithSuffix,
                    },
                    previousMessageHash: context.userMessageHash,
                    usage: response.usage,
                });
                await context.teamMemberFrozenChatPersistence.persistCompletedMessage(responseContentWithSuffix);

                // Note: [🐱‍🚀] Save the learned data
                if (!context.isPrivateModeEnabled && !context.isBookScopedAgent) {
                    const learnedAgentSource = resolveAppendOnlySelfLearningAgentSource({
                        unresolvedAgentSourceBeforeLearning: context.unresolvedAgentSource,
                        resolvedAgentSourceBeforeLearning: context.agentSource,
                        resolvedAgentSourceAfterLearning: agent.agentSource.value,
                    });

                    if (learnedAgentSource !== null) {
                        await context.collection.updateAgentSource(context.agentId, learnedAgentSource);
                    }
                }

                if (response.toolCalls && response.toolCalls.length > 0) {
                    emitToolCalls(response.toolCalls);
                    await logCalendarToolCallsActivity({
                        userId: context.currentUserIdentity?.userId ?? null,
                        agentPermanentId: context.agentId,
                        toolCalls: response.toolCalls,
                    });
                }

                closeStream();
            } catch (error) {
                if (isChatStreamCancellationError(error, request.signal)) {
                    markStreamClosed();
                    return;
                }

                markStreamClosed();
                try {
                    controller.error(error);
                } catch (streamError) {
                    console.error('[Agent chat stream] Failed to surface stream error', streamError);
                }
            } finally {
                request.signal.removeEventListener('abort', handleRequestAbort);
                markStreamClosed();
            }
        },
    });
}
