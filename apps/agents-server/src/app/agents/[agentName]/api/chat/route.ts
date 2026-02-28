import { CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS, CHAT_STREAM_KEEP_ALIVE_TOKEN } from '@/src/constants/streaming';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import {
    appendMessageSuffix,
    createMessageSuffixAppendix,
    emulateMessageSuffixStreaming,
    resolveMessageSuffixFromAgentSource,
} from '@/src/utils/chat/messageSuffix';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import {
    resolveMetaDisclaimerMarkdownFromAgentSource,
    resolveMetaDisclaimerStatusForUser,
} from '@/src/utils/metaDisclaimer';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { resolveUseProjectGithubTokenFromWallet } from '@/src/utils/userWallet';
import type { ChatMessage } from '@promptbook-local/components';
import { Agent, computeAgentHash, normalizeChatAttachments, RemoteAgent } from '@promptbook-local/core';
import type { ToolCall } from '@promptbook-local/types';
import { $getCurrentDate, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../../../../src/types/ToolCall';
import { encodeChatStreamWhitespaceForTransport } from '../../../../../../../../src/utils/chat/encodeChatStreamWhitespaceForTransport';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { isAgentDeleted } from '../../_utils';
import { prepareToolCallsForStreaming } from '../../../../../utils/toolCallStreaming';

/**
 * Shape of the incoming chat API payload.
 *
 * `attachments` and `parameters` are normalized later, so they stay unknown here.
 */
type ChatRequestBody = {
    message?: unknown;
    thread?: ReadonlyArray<ChatMessage>;
    attachments?: unknown;
    parameters?: unknown;
};

/**
 * Error name used when a chat stream is cancelled by the client.
 */
const CHAT_STREAM_ABORTED_ERROR_NAME = 'ChatStreamAbortedError';

/**
 * Extracts safe user message content from request payload.
 */
function resolveUserMessageContent(rawMessage: unknown): string {
    if (typeof rawMessage === 'string' && rawMessage.trim() !== '') {
        return rawMessage;
    }

    return 'Tell me more about yourself.';
}

/**
 * Allow long-running streams: set to platform maximum (seconds)
 */
export const maxDuration = 300;

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
 * Detects runtime abort errors thrown by web streams/fetch when the client disconnects.
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

export async function OPTIONS(request: Request) {
    keepUnused(request);

    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const deletedCheckAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'stream');
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    // Check if agent is deleted
    if (await isAgentDeleted(deletedCheckAgentIdentifier)) {
        return new Response(
            JSON.stringify({
                error: {
                    message: 'This agent has been deleted. You can restore it from the Recycle Bin.',
                    type: 'agent_deleted',
                },
            }),
            {
                status: 410, // Gone - indicates the resource is no longer available
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

    const body = (await request.json()) as ChatRequestBody;
    const message = resolveUserMessageContent(body.message);
    const thread = body.thread ? [...body.thread] : undefined;
    const attachments = normalizeChatAttachments(body.attachments);
    const rawParameters = body.parameters ?? {};
    const isPrivateModeEnabled = isPrivateModeEnabledFromRequest(request);
    //      <- TODO: [🐱‍🚀] To configuration DEFAULT_INITIAL_HIDDEN_MESSAGE

    try {
        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveBookScopedAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl: new URL(request.url).origin,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const agentSource = resolvedAgentContext.resolvedAgentSource;
        const agentId = resolvedAgentContext.parentAgentPermanentId;
        const resolvedAgentName = resolvedAgentContext.resolvedAgentName;
        const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
        // [▶️] const executionTools = await $provideExecutionToolsForServer();
        const messageSuffix = resolveMessageSuffixFromAgentSource(agentSource);
        const currentUserIdentity = await resolveCurrentUserMemoryIdentity();
        const projectGithubToken = currentUserIdentity
            ? await resolveUseProjectGithubTokenFromWallet({
                  userId: currentUserIdentity.userId,
                  agentPermanentId: agentId,
              })
            : undefined;
        const disclaimerMarkdown = resolveMetaDisclaimerMarkdownFromAgentSource(agentSource);

        if (disclaimerMarkdown) {
            if (!currentUserIdentity) {
                return new Response(
                    JSON.stringify({
                        error: {
                            message: 'You must accept the disclaimer before chatting with this agent.',
                            type: 'meta_disclaimer_required',
                        },
                    }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }

            const disclaimerStatus = await resolveMetaDisclaimerStatusForUser({
                userId: currentUserIdentity.userId,
                agentPermanentId: agentId,
                agentSource,
            });

            if (!disclaimerStatus.accepted) {
                return new Response(
                    JSON.stringify({
                        error: {
                            message: 'You must accept the disclaimer before chatting with this agent.',
                            type: 'meta_disclaimer_required',
                        },
                    }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
        }

        const incomingParameters =
            rawParameters && typeof rawParameters === 'object' && !Array.isArray(rawParameters)
                ? (rawParameters as Record<string, unknown>)
                : {};
        const promptParameters = composePromptParametersWithMemoryContext({
            baseParameters: incomingParameters,
            currentUserIdentity,
            agentPermanentId: agentId,
            agentName: resolvedAgentName,
            isPrivateModeEnabled,
            projectRepositories,
            projectGithubToken,
        });

        // Use AgentKitCacheManager for vector store caching
        const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
        const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();

        const agentHash = computeAgentHash(agentSource);

        // Note: Identify the user message
        const userMessageContent = {
            role: 'USER',
            content: message,
            attachments,
        };
        const recordChatHistoryMessage = await createChatHistoryRecorder({
            request,
            agentIdentifier: agentId,
            agentHash,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
            userId: currentUserIdentity?.userId ?? null,
            isEnabled: !isPrivateModeEnabled,
        });
        const userMessageHash = await recordChatHistoryMessage({
            message: userMessageContent,
            previousMessageHash: null, // <- TODO: [🧠] How to handle previous message hash?
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
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

                /**
                 * Streams tool calls to the client while deduplicating repeated snapshots.
                 */
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
                    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
                        agentSource,
                        resolvedAgentName,
                        baseOpenAiTools,
                        {
                            includeDynamicContext: true,
                            agentId,
                            agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
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
                            // [▶️] ...executionTools,
                            llm: agentKitResult.tools,
                        },
                        agentSource,
                        teacherAgent: await RemoteAgent.connect({
                            agentUrl: await getWellKnownAgentUrl('TEACHER'),
                        }), // <- [🦋]
                    });

                    const response = await agent.callChatModelStream!(
                        {
                            title: `Chat with agent ${
                                resolvedAgentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                            }`,
                            parameters: promptParameters,
                            modelRequirements: {
                                modelVariant: 'CHAT',
                            },
                            content: message,
                            thread,
                            attachments,
                        },
                        handleStreamChunk,
                        { signal: request.signal },
                    );

                    if (isStreamCancelled()) {
                        throw createChatStreamAbortedError();
                    }

                    const normalizedResponse = ensureNonEmptyChatContent({
                        content: response.content,
                        context: `Agent chat ${resolvedAgentName}`,
                    });

                    if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                        sendTextChunk(normalizedResponse.content);
                    }

                    const messageSuffixAppendix = createMessageSuffixAppendix(
                        normalizedResponse.content,
                        messageSuffix,
                    );
                    if (messageSuffixAppendix) {
                        await emulateMessageSuffixStreaming(messageSuffixAppendix, (delta) => {
                            sendTextChunk(delta);
                        });
                    }

                    if (isStreamCancelled()) {
                        throw createChatStreamAbortedError();
                    }

                    const responseContentWithSuffix = appendMessageSuffix(normalizedResponse.content, messageSuffix);

                    // Note: Identify the agent message
                    const agentMessageContent = {
                        role: 'MODEL',
                        content: responseContentWithSuffix,
                    };

                    await recordChatHistoryMessage({
                        message: agentMessageContent,
                        previousMessageHash: userMessageHash,
                        usage: response.usage,
                    });

                    // Note: [🐱‍🚀] Save the learned data
                    if (!isPrivateModeEnabled && !resolvedAgentContext.isBookScopedAgent) {
                        const newAgentSource = agent.agentSource.value;
                        if (newAgentSource !== agentSource) {
                            await collection.updateAgentSource(agentId, newAgentSource);
                        }
                    }

                    if (response.toolCalls && response.toolCalls.length > 0) {
                        emitToolCalls(response.toolCalls);
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

        return new Response(readableStream, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown',
                'Access-Control-Allow-Origin': '*', // <- Note: Allow embedding on other websites
            },
        });
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
