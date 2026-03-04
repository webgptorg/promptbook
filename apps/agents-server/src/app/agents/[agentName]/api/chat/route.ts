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
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import {
    createUserChat,
    getUserChat,
    updateUserChatMessages,
} from '@/src/utils/userChat';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { extractUserChatSynchronizationPayload } from '@/src/utils/chat/userChatSynchronization';
import type { ChatMessage } from '@promptbook-local/components';
import { Agent, computeAgentHash, normalizeChatAttachments, RemoteAgent } from '@promptbook-local/core';
import type { ToolCall, string_date_iso8601 } from '@promptbook-local/types';
import { $getCurrentDate, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../../../../src/types/ToolCall';
import { encodeChatStreamWhitespaceForTransport } from '../../../../../../../../src/utils/chat/encodeChatStreamWhitespaceForTransport';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { prepareToolCallsForStreaming } from '../../../../../utils/toolCallStreaming';
import { isAgentDeleted } from '../../_utils';

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
 * Interval used to throttle in-progress chat sync writes.
 */
const USER_CHAT_STREAM_SYNC_THROTTLE_MS = 1_000;

/**
 * Fallback message stored when streaming fails before producing any content.
 */
const USER_CHAT_STREAM_FAILURE_MESSAGE = 'The response could not be completed due to a server error.';

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
 * Builds one user chat message row for persistence.
 */
function createPersistedUserMessage(
    content: string,
    attachments: ChatMessage['attachments'],
    createdAt: string_date_iso8601,
): ChatMessage {
    return {
        id: `user_${Date.now()}`,
        createdAt,
        sender: 'USER',
        content,
        attachments,
        isComplete: true,
    };
}

/**
 * Builds one placeholder assistant message that will be progressively updated while streaming.
 */
function createPersistedAssistantMessage(assistantMessageId: string, createdAt: string_date_iso8601): ChatMessage {
    return {
        id: assistantMessageId,
        createdAt,
        sender: 'AGENT',
        content: '',
        isComplete: false,
    };
}

/**
 * Ensures the persisted thread includes the latest user prompt as its newest user message.
 */
function buildPersistedThreadMessages(options: {
    thread: ReadonlyArray<ChatMessage> | undefined;
    message: string;
    attachments: ChatMessage['attachments'];
    createdAt: string_date_iso8601;
}): Array<ChatMessage> {
    const normalizedThread = options.thread ? [...options.thread] : [];
    const lastMessage = normalizedThread[normalizedThread.length - 1];
    const isLastMessageUser = typeof lastMessage?.sender === 'string' && lastMessage.sender.toUpperCase() === 'USER';
    const lastMessageContent = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

    if (isLastMessageUser && lastMessageContent.trim() === options.message.trim()) {
        return normalizedThread;
    }

    return [
        ...normalizedThread,
        createPersistedUserMessage(options.message, options.attachments, options.createdAt),
    ];
}

/**
 * Builds one assistant message snapshot for persisted user-chat synchronization.
 */
function buildPersistedAssistantMessageUpdate(options: {
    assistantMessageId: string;
    assistantMessageStartedAt: string_date_iso8601;
    content: string;
    isComplete: boolean;
    toolCalls?: ReadonlyArray<ToolCall>;
    generationDurationMs?: number;
}): ChatMessage {
    return {
        id: options.assistantMessageId,
        createdAt: options.assistantMessageStartedAt,
        sender: 'AGENT',
        content: options.content,
        isComplete: options.isComplete,
        ongoingToolCalls: options.isComplete ? undefined : options.toolCalls,
        toolCalls: options.isComplete ? options.toolCalls : undefined,
        completedToolCalls: options.isComplete ? options.toolCalls : undefined,
        generationDurationMs: options.generationDurationMs,
    };
}

/**
 * Mutable state used while persisting one streaming response into `UserChat`.
 */
type UserChatSynchronizationState = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    assistantMessageId: string;
    assistantMessageStartedAt: string_date_iso8601;
    assistantContent: string;
    assistantToolCalls?: ReadonlyArray<ToolCall>;
    messages: Array<ChatMessage>;
    pendingPersist: Promise<void>;
    lastPersistedAtMs: number;
};

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
    const { cleanedParameters: incomingParameters, userChatId } = extractUserChatSynchronizationPayload(body.parameters);
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
            ? await resolveUseProjectGithubToken({
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
            sender: 'USER',
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

        const assistantMessageStartedAt = $getCurrentDate();
        const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        let userChatSynchronization: UserChatSynchronizationState | null = null;

        if (!isPrivateModeEnabled && userChatId && currentUserIdentity) {
            try {
                const threadMessages = buildPersistedThreadMessages({
                    thread,
                    message,
                    attachments,
                    createdAt: $getCurrentDate(),
                });
                const initialMessages = [
                    ...threadMessages,
                    createPersistedAssistantMessage(assistantMessageId, assistantMessageStartedAt),
                ];

                const existingChat = await getUserChat({
                    userId: currentUserIdentity.userId,
                    agentPermanentId: agentId,
                    chatId: userChatId,
                });

                if (existingChat) {
                    await updateUserChatMessages({
                        userId: currentUserIdentity.userId,
                        agentPermanentId: agentId,
                        chatId: userChatId,
                        messages: initialMessages,
                    });
                } else {
                    await createUserChat({
                        userId: currentUserIdentity.userId,
                        agentPermanentId: agentId,
                        chatId: userChatId,
                        messages: initialMessages,
                    });
                }

                userChatSynchronization = {
                    userId: currentUserIdentity.userId,
                    agentPermanentId: agentId,
                    chatId: userChatId,
                    assistantMessageId,
                    assistantMessageStartedAt,
                    assistantContent: '',
                    assistantToolCalls: undefined,
                    messages: initialMessages,
                    pendingPersist: Promise.resolve(),
                    lastPersistedAtMs: Date.now(),
                };
            } catch (error) {
                console.warn('[Agent chat stream] Failed to initialize user-chat synchronization', error);
            }
        }

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                let hasMeaningfulDelta = false;
                let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
                let lastToolCallsFrame: string | null = null;
                let isStreamClosed = false;
                const isPersistedUserChatSyncEnabled = userChatSynchronization !== null;

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
                 * Returns true when generation should be cancelled due to client abort.
                 */
                const shouldCancelGeneration = (): boolean => {
                    if (isPersistedUserChatSyncEnabled) {
                        return false;
                    }

                    return request.signal.aborted;
                };

                /**
                 * Updates the synchronized `UserChat` assistant message and persists it to the database.
                 */
                const updateSynchronizedUserChatAssistant = (options: {
                    content?: string;
                    toolCalls?: ReadonlyArray<ToolCall>;
                    isComplete: boolean;
                    generationDurationMs?: number;
                    forcePersist?: boolean;
                }): Promise<void> => {
                    const synchronizedChat = userChatSynchronization;
                    if (!synchronizedChat) {
                        return Promise.resolve();
                    }

                    if (typeof options.content === 'string') {
                        synchronizedChat.assistantContent = options.content;
                    }

                    if (options.toolCalls) {
                        synchronizedChat.assistantToolCalls = [...options.toolCalls];
                    }

                    const assistantMessage = buildPersistedAssistantMessageUpdate({
                        assistantMessageId: synchronizedChat.assistantMessageId,
                        assistantMessageStartedAt: synchronizedChat.assistantMessageStartedAt,
                        content: synchronizedChat.assistantContent,
                        isComplete: options.isComplete,
                        toolCalls: synchronizedChat.assistantToolCalls,
                        generationDurationMs: options.generationDurationMs,
                    });

                    const assistantMessageIndex = synchronizedChat.messages.findIndex(
                        (message) => message.id === synchronizedChat.assistantMessageId,
                    );
                    if (assistantMessageIndex === -1) {
                        synchronizedChat.messages = [...synchronizedChat.messages, assistantMessage];
                    } else {
                        const nextMessages = [...synchronizedChat.messages];
                        nextMessages[assistantMessageIndex] = assistantMessage;
                        synchronizedChat.messages = nextMessages;
                    }

                    const nowMs = Date.now();
                    const shouldPersistNow =
                        options.forcePersist ||
                        nowMs - synchronizedChat.lastPersistedAtMs >= USER_CHAT_STREAM_SYNC_THROTTLE_MS;
                    if (!shouldPersistNow) {
                        return synchronizedChat.pendingPersist;
                    }

                    synchronizedChat.lastPersistedAtMs = nowMs;
                    const nextMessagesSnapshot = [...synchronizedChat.messages];
                    const persistenceTask = synchronizedChat.pendingPersist
                        .catch(() => undefined)
                        .then(async () => {
                            await updateUserChatMessages({
                                userId: synchronizedChat.userId,
                                agentPermanentId: synchronizedChat.agentPermanentId,
                                chatId: synchronizedChat.chatId,
                                messages: nextMessagesSnapshot,
                            });
                        })
                        .catch((error) => {
                            console.warn('[Agent chat stream] Failed to synchronize user chat', error);
                        });

                    synchronizedChat.pendingPersist = persistenceTask;
                    return persistenceTask;
                };

                /**
                 * Appends one streamed markdown delta into synchronized user-chat state.
                 */
                const appendSynchronizedUserChatDelta = (delta: string): void => {
                    if (!userChatSynchronization || !delta) {
                        return;
                    }

                    userChatSynchronization.assistantContent += delta;
                    void updateSynchronizedUserChatAssistant({
                        content: userChatSynchronization.assistantContent,
                        isComplete: false,
                    });
                };

                /**
                 * Enqueues one markdown chunk while normalizing client disconnects.
                 */
                const enqueueChunk = (chunk: string): void => {
                    if (isStreamClosed) {
                        return;
                    }

                    if (shouldCancelGeneration()) {
                        throw createChatStreamAbortedError();
                    }

                    try {
                        controller.enqueue(encoder.encode(chunk));
                    } catch (error) {
                        if (isAbortLikeError(error) || request.signal.aborted) {
                            markStreamClosed();

                            if (!isPersistedUserChatSyncEnabled) {
                                throw createChatStreamAbortedError();
                            }

                            return;
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
                    void updateSynchronizedUserChatAssistant({
                        toolCalls: preparedToolCalls,
                        isComplete: false,
                    });
                    const frame = createToolCallsStreamFrame(preparedToolCalls);
                    if (frame === lastToolCallsFrame) {
                        return;
                    }

                    lastToolCallsFrame = frame;
                    enqueueChunk(frame);
                };

                if (shouldCancelGeneration()) {
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
                        appendSynchronizedUserChatDelta(deltaContent);
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

                    const streamCallOptions = isPersistedUserChatSyncEnabled ? undefined : { signal: request.signal };
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
                        streamCallOptions,
                    );

                    if (shouldCancelGeneration()) {
                        throw createChatStreamAbortedError();
                    }

                    const normalizedResponse = ensureNonEmptyChatContent({
                        content: response.content,
                        context: `Agent chat ${resolvedAgentName}`,
                    });

                    if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                        appendSynchronizedUserChatDelta(normalizedResponse.content);
                        sendTextChunk(normalizedResponse.content);
                    }

                    const messageSuffixAppendix = createMessageSuffixAppendix(
                        normalizedResponse.content,
                        messageSuffix,
                    );
                    if (messageSuffixAppendix) {
                        await emulateMessageSuffixStreaming(messageSuffixAppendix, (delta) => {
                            appendSynchronizedUserChatDelta(delta);
                            sendTextChunk(delta);
                        });
                    }

                    if (shouldCancelGeneration()) {
                        throw createChatStreamAbortedError();
                    }

                    const responseContentWithSuffix = appendMessageSuffix(normalizedResponse.content, messageSuffix);
                    const generationDurationMs = Math.max(0, Date.now() - Date.parse(assistantMessageStartedAt));

                    await updateSynchronizedUserChatAssistant({
                        content: responseContentWithSuffix,
                        toolCalls: response.toolCalls,
                        isComplete: true,
                        generationDurationMs,
                        forcePersist: true,
                    });

                    // Note: Identify the agent message
                    const agentMessageContent = {
                        role: 'MODEL',
                        sender: 'MODEL',
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
                    if (!isPersistedUserChatSyncEnabled && isChatStreamCancellationError(error, request.signal)) {
                        markStreamClosed();
                        return;
                    }

                    const fallbackAssistantContent =
                        userChatSynchronization && userChatSynchronization.assistantContent.trim().length > 0
                            ? userChatSynchronization.assistantContent
                            : USER_CHAT_STREAM_FAILURE_MESSAGE;
                    const generationDurationMs = Math.max(0, Date.now() - Date.parse(assistantMessageStartedAt));
                    await updateSynchronizedUserChatAssistant({
                        content: fallbackAssistantContent,
                        isComplete: true,
                        generationDurationMs,
                        forcePersist: true,
                    });

                    try {
                        controller.error(error);
                    } catch (streamError) {
                        console.error('[Agent chat stream] Failed to surface stream error', streamError);
                    }
                    markStreamClosed();
                } finally {
                    request.signal.removeEventListener('abort', handleRequestAbort);
                    if (userChatSynchronization) {
                        await userChatSynchronization.pendingPersist;
                    }
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
