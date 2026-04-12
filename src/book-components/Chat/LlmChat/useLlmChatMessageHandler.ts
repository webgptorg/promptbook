'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { Prompt } from '../../../types/Prompt';
import type { id, string_date_iso8601, string_markdown } from '../../../types/typeAliases';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { ChatMessage } from '../types/ChatMessage';
import { getRandomThinkingMessageDelayMs, getRandomThinkingMessageVariant } from '../utils/thinkingMessageVariants';
import type { LlmChatProps } from './LlmChatProps';

/**
 * Background recovery payload persisted while the page is hidden.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type BackgroundRecoveryPayload = {
    readonly content: string;
    readonly attachments: ChatMessage['attachments'];
};

/**
 * Minimal task-progress item rendered by `<Chat/>`.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type LlmChatTaskProgress = {
    readonly id: string;
    readonly name: string;
    readonly progress?: number;
};

/**
 * Failed message snapshot used by retry flows.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type FailedMessage = BackgroundRecoveryPayload;

/**
 * Internal send signature shared across retry and visibility-recovery flows.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type HandleMessageFn = (messageContent: string, attachments?: ChatMessage['attachments']) => Promise<void>;

/**
 * Streaming chunk shape consumed by the chat placeholder renderer.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type StreamingChunk = {
    readonly content: string;
    readonly toolCalls?: ChatMessage['ongoingToolCalls'];
};

/**
 * Final chat-model result shape returned from LLM tools.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type LlmChatResult = Awaited<ReturnType<NonNullable<LlmExecutionTools['callChatModel']>>>;

/**
 * Disposable thinking-message rotation controller.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type ThinkingMessageRotation = {
    readonly initialVariant: string;
    readonly stop: () => void;
};

/**
 * Chat message created inside one `<LlmChat/>` request with required id and timestamp fields.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type CreatedChatMessage = ChatMessage & {
    readonly createdAt: string_date_iso8601;
    readonly id: string;
};

/**
 * Picks the first placeholder message shown before any rotation starts.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function resolveInitialThinkingVariant(thinkingVariants: ReadonlyArray<string>): string {
    return getRandomThinkingMessageVariant(thinkingVariants);
}

/**
 * Inputs required by `useLlmChatMessageHandler`.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type UseLlmChatMessageHandlerProps = {
    readonly chatFailMessage: string;
    readonly hasUserInteractedRef: MutableRefObject<boolean>;
    readonly llmParticipantName: id;
    readonly llmTools: LlmExecutionTools;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly onError?: LlmChatProps['onError'];
    readonly promptParameters: Record<string, string>;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
    readonly setTasksProgress: Dispatch<SetStateAction<Array<LlmChatTaskProgress>>>;
    readonly thinkingVariants: ReadonlyArray<string>;
    readonly thread?: ReadonlyArray<ChatMessage>;
    readonly userParticipantName: id;
};

/**
 * State and handlers returned by `useLlmChatMessageHandler`.
 *
 * @private function of `useLlmChatMessageHandler`
 */
type UseLlmChatMessageHandlerResult = {
    readonly clearLastFailedMessage: () => void;
    readonly handleMessage: HandleMessageFn;
    readonly handleStopStreaming: () => void;
    readonly isStreaming: boolean;
};

/**
 * Updates a specific chat message while preserving all other message references.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function updateMessageById(
    messages: ReadonlyArray<ChatMessage>,
    messageId: string,
    updateMessage: (message: ChatMessage) => ChatMessage,
): Array<ChatMessage> {
    return messages.map((message) => (message.id === messageId ? updateMessage(message) : message));
}

/**
 * Creates the completed user message that starts one chat turn.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createUserChatMessage(params: {
    readonly attachments: ChatMessage['attachments'];
    readonly createdAt: string_date_iso8601;
    readonly messageContent: string;
    readonly userParticipantName: id;
}): CreatedChatMessage {
    const { attachments, createdAt, messageContent, userParticipantName } = params;

    return {
        // channel: 'PROMPTBOOK_CHAT',
        id: `user_${Date.now()}`,
        createdAt,
        sender: userParticipantName,
        content: messageContent as string_markdown,
        isComplete: true,
        attachments,
    };
}

/**
 * Creates the initial placeholder assistant message shown while the model buffers.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createLoadingAssistantMessage(params: {
    readonly createdAt: string_date_iso8601;
    readonly llmParticipantName: id;
    readonly thinkingVariant: string;
}): CreatedChatMessage {
    const { createdAt, llmParticipantName, thinkingVariant } = params;

    return {
        // channel: 'PROMPTBOOK_CHAT',
        id: `assistant_${Date.now()}`,
        createdAt,
        sender: llmParticipantName,
        content: thinkingVariant as string_markdown,
        isComplete: false,
    };
}

/**
 * Creates the streaming assistant snapshot rendered while chunks arrive.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createStreamingAssistantMessage(params: {
    readonly assistantMessageStartedAt: string_date_iso8601;
    readonly chunk: StreamingChunk;
    readonly llmParticipantName: id;
    readonly loadingMessageId: string;
}): CreatedChatMessage {
    const { assistantMessageStartedAt, chunk, llmParticipantName, loadingMessageId } = params;

    return {
        // channel: 'PROMPTBOOK_CHAT',
        id: loadingMessageId,
        createdAt: assistantMessageStartedAt,
        sender: llmParticipantName,
        content: chunk.content as string_markdown,
        isComplete: false,
        ongoingToolCalls: chunk.toolCalls,
    };
}

/**
 * Creates the final completed assistant message after the model responds.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createCompletedAssistantMessage(params: {
    readonly assistantMessageId: string;
    readonly generationDurationMs: number;
    readonly llmParticipantName: id;
    readonly result: LlmChatResult;
}): CreatedChatMessage {
    const { assistantMessageId, generationDurationMs, llmParticipantName, result } = params;

    return {
        // channel: 'PROMPTBOOK_CHAT',
        id: assistantMessageId,
        createdAt: $getCurrentDate(),
        sender: llmParticipantName,
        content: result.content as string_markdown,
        isComplete: true,
        toolCalls: result.toolCalls,
        completedToolCalls: result.toolCalls,
        generationDurationMs,
    };
}

/**
 * Creates the friendly assistant fallback shown after one failed request.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createFailedAssistantMessage(params: {
    readonly assistantMessageId: string;
    readonly chatFailMessage: string;
    readonly generationDurationMs: number;
    readonly llmParticipantName: id;
}): CreatedChatMessage {
    const { assistantMessageId, chatFailMessage, generationDurationMs, llmParticipantName } = params;

    return {
        // channel: 'PROMPTBOOK_CHAT',
        id: assistantMessageId,
        createdAt: $getCurrentDate(),
        sender: llmParticipantName,
        content: chatFailMessage as string_markdown,
        isComplete: true,
        generationDurationMs,
    };
}

/**
 * Starts rotating placeholder thinking messages until stopped.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function startThinkingMessageRotation(params: {
    readonly initialVariant: string;
    readonly loadingMessageId: string;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
    readonly thinkingVariants: ReadonlyArray<string>;
}): ThinkingMessageRotation {
    const { initialVariant, loadingMessageId, setMessages, thinkingVariants } = params;

    if (thinkingVariants.length <= 1) {
        return {
            initialVariant,
            stop: () => {},
        };
    }

    let thinkingRotationTimer: ReturnType<typeof setTimeout> | null = null;
    let isThinkingRotationActive = true;
    let currentRotationVariant = initialVariant;

    const stop = () => {
        isThinkingRotationActive = false;

        if (thinkingRotationTimer !== null) {
            clearTimeout(thinkingRotationTimer);
            thinkingRotationTimer = null;
        }
    };

    const scheduleNextThinkingVariant = () => {
        if (!isThinkingRotationActive) {
            return;
        }

        thinkingRotationTimer = setTimeout(() => {
            if (!isThinkingRotationActive) {
                return;
            }

            const nextVariant = getRandomThinkingMessageVariant(thinkingVariants, currentRotationVariant);
            currentRotationVariant = nextVariant;

            setMessages((previousMessages) =>
                updateMessageById(previousMessages, loadingMessageId, (message) =>
                    message.isComplete ? message : { ...message, content: nextVariant as string_markdown },
                ),
            );

            scheduleNextThinkingVariant();
        }, getRandomThinkingMessageDelayMs());
    };

    scheduleNextThinkingVariant();

    return {
        initialVariant,
        stop,
    };
}

/**
 * Builds the prompt sent to the chat model for one user turn.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function createChatPrompt(params: {
    readonly attachments: ChatMessage['attachments'];
    readonly messageContent: string;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly promptParameters: Record<string, string>;
    readonly thread?: ReadonlyArray<ChatMessage>;
    readonly userMessage: ChatMessage;
}): Prompt {
    const { attachments, messageContent, messages, promptParameters, thread, userMessage } = params;
    const currentHistory = messages.filter((message) => message.isComplete);

    return {
        title: 'User Message',
        content: messageContent as string_markdown,
        parameters: promptParameters,
        modelRequirements: {
            modelVariant: 'CHAT' as const,
        },
        thread: thread ? [...thread] : [...currentHistory, userMessage],
        attachments,
    };
}

/**
 * Executes one chat request using either streaming or non-streaming tools.
 *
 * @private function of `useLlmChatMessageHandler`
 */
async function executeLlmChatPrompt(params: {
    readonly assistantMessageStartedAt: string_date_iso8601;
    readonly llmParticipantName: id;
    readonly llmTools: LlmExecutionTools;
    readonly loadingMessageId: string;
    readonly prompt: Prompt;
    readonly setIsStreaming: Dispatch<SetStateAction<boolean>>;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
    readonly stopThinkingRotation: () => void;
    readonly streamingAbortControllerRef: MutableRefObject<AbortController | null>;
}): Promise<{ result: LlmChatResult; streamingAbortController: AbortController | null }> {
    const {
        assistantMessageStartedAt,
        llmParticipantName,
        llmTools,
        loadingMessageId,
        prompt,
        setIsStreaming,
        setMessages,
        stopThinkingRotation,
        streamingAbortControllerRef,
    } = params;

    if (llmTools.callChatModelStream) {
        const streamingAbortController = new AbortController();
        streamingAbortControllerRef.current = streamingAbortController;
        setIsStreaming(true);

        const result = await llmTools.callChatModelStream(
            prompt,
            (chunk) => {
                stopThinkingRotation();

                const assistantMessage = createStreamingAssistantMessage({
                    assistantMessageStartedAt,
                    chunk,
                    llmParticipantName,
                    loadingMessageId,
                });

                setMessages((previousMessages) =>
                    updateMessageById(previousMessages, loadingMessageId, () => assistantMessage),
                );
            },
            { signal: streamingAbortController.signal },
        );

        return {
            result,
            streamingAbortController,
        };
    }

    if (llmTools.callChatModel) {
        return {
            result: await llmTools.callChatModel(prompt),
            streamingAbortController: null,
        };
    }

    throw new Error('LLM tools do not support chat model calls');
}

/**
 * Marks the current placeholder message as completed after a manual stream stop.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function finalizeAbortedStreamingRequest(params: {
    readonly loadingMessageId: string;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
    readonly setTasksProgress: Dispatch<SetStateAction<Array<LlmChatTaskProgress>>>;
}): void {
    const { loadingMessageId, setMessages, setTasksProgress } = params;
    setTasksProgress([]);
    setMessages((previousMessages) =>
        updateMessageById(previousMessages, loadingMessageId, (message) => ({ ...message, isComplete: true })),
    );
}

/**
 * Schedules the transient task-progress indicator to disappear after success.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function scheduleTaskProgressClear(setTasksProgress: Dispatch<SetStateAction<Array<LlmChatTaskProgress>>>): void {
    setTimeout(() => {
        setTasksProgress([]);
    }, 1000);
}

/**
 * Returns true when the caught error came from an intentionally aborted stream.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function isAbortedStreamingRequest(streamingAbortController: AbortController | null): boolean {
    return streamingAbortController?.signal.aborted === true;
}

/**
 * Persists the failed message and renders the friendly failure bubble when needed.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function finalizeFailedChatRequest(params: {
    readonly attachments: ChatMessage['attachments'];
    readonly backgroundedDuringRequestRef: MutableRefObject<boolean>;
    readonly chatFailMessage: string;
    readonly error: unknown;
    readonly generationStartedAtMs: number;
    readonly handleRetryRef: MutableRefObject<() => void>;
    readonly llmParticipantName: id;
    readonly loadingMessageId: string;
    readonly messageContent: string;
    readonly onError?: LlmChatProps['onError'];
    readonly pendingBackgroundRecoveryRef: MutableRefObject<BackgroundRecoveryPayload | null>;
    readonly setLastFailedMessage: Dispatch<SetStateAction<FailedMessage | null>>;
    readonly setMessages: Dispatch<SetStateAction<Array<ChatMessage>>>;
    readonly setTasksProgress: Dispatch<SetStateAction<Array<LlmChatTaskProgress>>>;
}): boolean {
    const {
        attachments,
        backgroundedDuringRequestRef,
        chatFailMessage,
        error,
        generationStartedAtMs,
        handleRetryRef,
        llmParticipantName,
        loadingMessageId,
        messageContent,
        onError,
        pendingBackgroundRecoveryRef,
        setLastFailedMessage,
        setMessages,
        setTasksProgress,
    } = params;
    const failedMessage = {
        content: messageContent,
        attachments,
    };

    setLastFailedMessage(failedMessage);

    if (backgroundedDuringRequestRef.current) {
        pendingBackgroundRecoveryRef.current = failedMessage;
        return true;
    }

    if (onError) {
        onError(error, () => handleRetryRef.current(), failedMessage);
    }

    const errorMessage = createFailedAssistantMessage({
        assistantMessageId: loadingMessageId,
        chatFailMessage,
        generationDurationMs: Date.now() - generationStartedAtMs,
        llmParticipantName,
    });

    setMessages((previousMessages) => updateMessageById(previousMessages, loadingMessageId, () => errorMessage));
    setTasksProgress([]);

    return false;
}

/**
 * Returns true when the visibility handler should restart a failed request.
 *
 * @private function of `useLlmChatMessageHandler`
 */
function shouldRecoverAfterVisibilityRestore(params: {
    readonly handleMessage: HandleMessageFn | null;
    readonly isBackgroundRecoveryRunning: boolean;
    readonly pendingBackgroundRecovery: BackgroundRecoveryPayload | null;
    readonly requestInFlight: boolean;
    readonly visibilityState: DocumentVisibilityState;
}): boolean {
    const { handleMessage, isBackgroundRecoveryRunning, pendingBackgroundRecovery, requestInFlight, visibilityState } =
        params;

    return (
        visibilityState === 'visible' &&
        !requestInFlight &&
        !isBackgroundRecoveryRunning &&
        !!pendingBackgroundRecovery &&
        !!handleMessage
    );
}

/**
 * Manages send, stream, retry, and background-recovery flows for `<LlmChat/>`.
 *
 * @private function of `useLlmChatState`
 */
export function useLlmChatMessageHandler(props: UseLlmChatMessageHandlerProps): UseLlmChatMessageHandlerResult {
    const {
        chatFailMessage,
        hasUserInteractedRef,
        llmParticipantName,
        llmTools,
        messages,
        onError,
        promptParameters,
        setMessages,
        setTasksProgress,
        thinkingVariants,
        thread,
        userParticipantName,
    } = props;
    const [lastFailedMessage, setLastFailedMessage] = useState<FailedMessage | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const handleRetryRef = useRef<() => void>(() => {});
    const streamingAbortControllerRef = useRef<AbortController | null>(null);
    const requestInFlightRef = useRef(false);
    const backgroundedDuringRequestRef = useRef(false);
    const pendingBackgroundRecoveryRef = useRef<BackgroundRecoveryPayload | null>(null);
    const isBackgroundRecoveryRunningRef = useRef(false);
    const handleMessageRef = useRef<HandleMessageFn | null>(null);

    const handleMessage = useCallback<HandleMessageFn>(
        async (messageContent, attachments = []) => {
            hasUserInteractedRef.current = true;
            requestInFlightRef.current = true;
            backgroundedDuringRequestRef.current = false;
            pendingBackgroundRecoveryRef.current = null;

            const userMessageCreatedAt = $getCurrentDate();
            const assistantMessageStartedAt = $getCurrentDate();
            const initialThinkingVariant = resolveInitialThinkingVariant(thinkingVariants);
            const userMessage = createUserChatMessage({
                attachments,
                createdAt: userMessageCreatedAt,
                messageContent,
                userParticipantName,
            });
            const loadingMessage = createLoadingAssistantMessage({
                createdAt: assistantMessageStartedAt,
                llmParticipantName,
                thinkingVariant: initialThinkingVariant,
            });

            const activeThinkingMessageRotation = startThinkingMessageRotation({
                initialVariant: initialThinkingVariant,
                loadingMessageId: loadingMessage.id,
                setMessages,
                thinkingVariants,
            });

            setMessages((previousMessages) => [...previousMessages, userMessage, loadingMessage]);

            const taskId = `llm_call_${Date.now()}`;
            setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 0 }]);

            const generationStartedAtMs = Date.now();
            let streamingAbortController: AbortController | null = null;

            try {
                const prompt = createChatPrompt({
                    attachments,
                    messageContent,
                    messages,
                    promptParameters,
                    thread,
                    userMessage,
                });

                setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 50 }]);

                const execution = await executeLlmChatPrompt({
                    assistantMessageStartedAt,
                    llmParticipantName,
                    llmTools,
                    loadingMessageId: loadingMessage.id,
                    prompt,
                    setIsStreaming,
                    setMessages,
                    stopThinkingRotation: activeThinkingMessageRotation.stop,
                    streamingAbortControllerRef,
                });

                streamingAbortController = execution.streamingAbortController;
                setTasksProgress([{ id: taskId, name: 'Response generated', progress: 100 }]);

                if (!execution.result.content.trim()) {
                    throw new Error('The agent did not respond.');
                }

                activeThinkingMessageRotation.stop();

                const assistantMessage = createCompletedAssistantMessage({
                    assistantMessageId: loadingMessage.id,
                    generationDurationMs: Date.now() - generationStartedAtMs,
                    llmParticipantName,
                    result: execution.result,
                });

                setMessages((previousMessages) =>
                    updateMessageById(previousMessages, loadingMessage.id, () => assistantMessage),
                );

                scheduleTaskProgressClear(setTasksProgress);
            } catch (error) {
                console.error('Error calling LLM:', error);
                activeThinkingMessageRotation.stop();

                if (isAbortedStreamingRequest(streamingAbortController)) {
                    finalizeAbortedStreamingRequest({
                        loadingMessageId: loadingMessage.id,
                        setMessages,
                        setTasksProgress,
                    });
                    return;
                }

                const isQueuedForBackgroundRecovery = finalizeFailedChatRequest({
                    attachments,
                    backgroundedDuringRequestRef,
                    chatFailMessage,
                    error,
                    generationStartedAtMs,
                    handleRetryRef,
                    llmParticipantName,
                    loadingMessageId: loadingMessage.id,
                    messageContent,
                    onError,
                    pendingBackgroundRecoveryRef,
                    setLastFailedMessage,
                    setMessages,
                    setTasksProgress,
                });

                if (isQueuedForBackgroundRecovery) {
                    return;
                }
            } finally {
                if (streamingAbortControllerRef.current === streamingAbortController) {
                    streamingAbortControllerRef.current = null;
                }

                setIsStreaming(false);
                requestInFlightRef.current = false;
            }
        },
        [
            chatFailMessage,
            hasUserInteractedRef,
            llmParticipantName,
            llmTools,
            messages,
            onError,
            promptParameters,
            setMessages,
            setTasksProgress,
            thinkingVariants,
            thread,
            userParticipantName,
        ],
    );

    const clearLastFailedMessage = useCallback(() => {
        setLastFailedMessage(null);
    }, []);

    const handleRetry = useCallback(() => {
        if (!lastFailedMessage) {
            return;
        }

        void handleMessage(lastFailedMessage.content, lastFailedMessage.attachments);
    }, [handleMessage, lastFailedMessage]);

    const handleStopStreaming = useCallback(() => {
        const controller = streamingAbortControllerRef.current;

        if (!controller) {
            return;
        }

        controller.abort();
        setIsStreaming(false);
    }, []);

    useEffect(() => {
        handleRetryRef.current = handleRetry;
    }, [handleRetry]);

    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                if (requestInFlightRef.current) {
                    backgroundedDuringRequestRef.current = true;
                }

                return;
            }

            if (
                !shouldRecoverAfterVisibilityRestore({
                    handleMessage: handleMessageRef.current,
                    isBackgroundRecoveryRunning: isBackgroundRecoveryRunningRef.current,
                    pendingBackgroundRecovery: pendingBackgroundRecoveryRef.current,
                    requestInFlight: requestInFlightRef.current,
                    visibilityState: document.visibilityState,
                })
            ) {
                return;
            }

            const pendingRecovery = pendingBackgroundRecoveryRef.current;

            if (!pendingRecovery || !handleMessageRef.current) {
                return;
            }

            pendingBackgroundRecoveryRef.current = null;
            isBackgroundRecoveryRunningRef.current = true;

            const nextRun = handleMessageRef.current(pendingRecovery.content, pendingRecovery.attachments);
            nextRun.finally(() => {
                isBackgroundRecoveryRunningRef.current = false;
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return {
        clearLastFailedMessage,
        handleMessage,
        handleStopStreaming,
        isStreaming,
    };
}
