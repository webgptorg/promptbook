'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentCapability } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { Prompt } from '../../../types/Prompt';
import type { string_markdown } from '../../../types/typeAliases';
import { DEFAULT_THINKING_MESSAGES } from '../../../utils/DEFAULT_THINKING_MESSAGES';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatPersistence } from '../utils/ChatPersistence';
import { createTeamToolNameFromUrl } from '../utils/createTeamToolNameFromUrl';
import { DEFAULT_CHAT_FAIL_MESSAGE } from './defaults';
import type { FriendlyErrorMessage } from './FriendlyErrorMessage';
import type { LlmChatProps } from './LlmChatProps';
import chatStyles from '../Chat/Chat.module.css';
import { StopIcon } from '../../icons/StopIcon';

/**
 * Metadata for a teammate agent tool.
 */
type TeammateMetadata = {
    url: string;
    label?: string;
    instructions?: string;
    toolName: string;
};

/**
 * Lookup map of teammate metadata by tool name.
 */
type TeammatesMap = Record<string, TeammateMetadata>;

/**
 * Builds a teammates lookup map from a list of teammate metadata entries.
 */
function buildTeammatesMap(entries: Array<TeammateMetadata>): TeammatesMap | undefined {
    const teammatesMap: TeammatesMap = {};

    for (const teammate of entries) {
        if (teammate.toolName) {
            teammatesMap[teammate.toolName] = teammate;
        }
    }

    return Object.keys(teammatesMap).length > 0 ? teammatesMap : undefined;
}

/**
 * Builds teammate metadata based on team capabilities when model requirements are unavailable.
 */
function buildTeammatesMapFromCapabilities(capabilities: Array<AgentCapability> | undefined): TeammatesMap | undefined {
    if (!capabilities || capabilities.length === 0) {
        return undefined;
    }

    const teamEntries: Array<TeammateMetadata> = [];

    for (const capability of capabilities) {
        if (capability.type !== 'team' || !capability.agentUrl) {
            continue;
        }

        teamEntries.push({
            url: capability.agentUrl,
            label: capability.label,
            toolName: createTeamToolNameFromUrl(capability.agentUrl),
        });
    }

    return buildTeammatesMap(teamEntries);
}

/**
 * Details required to schedule a background recovery retry.
 *
 * @private internal helper for LLM chat background resilience
 */
type BackgroundRecoveryPayload = {
    content: string;
    attachments: ChatMessage['attachments'];
};

/**
 * Message handler signature exposed to background recovery helpers.
 *
 * @private internal helper for LLM chat background resilience
 */
type HandleMessageFn = (messageContent: string, attachments?: ChatMessage['attachments']) => Promise<void>;

const THINKING_MESSAGE_DELAY_MIN_MS = 1000;
const THINKING_MESSAGE_DELAY_MAX_MS = 5000;

/**
 * Returns a random duration (in milliseconds) between the configured minimum and maximum
 * thinking message display time.
 */
function getRandomThinkingDelayMs(): number {
    const range = THINKING_MESSAGE_DELAY_MAX_MS - THINKING_MESSAGE_DELAY_MIN_MS;
    return Math.floor(Math.random() * (range + 1)) + THINKING_MESSAGE_DELAY_MIN_MS;
}

/**
 * Selects a random thinking message variant, preferring one that differs from the previously
 * shown variant when possible.
 *
 * @param variants List of available thinking message variants.
 * @param excludeVariant Message to avoid repeating immediately (optional).
 */
function getRandomThinkingVariant(variants: ReadonlyArray<string>, excludeVariant?: string): string {
    if (variants.length === 0) {
        return '';
    }

    const candidates =
        excludeVariant && variants.length > 1 ? variants.filter((variant) => variant !== excludeVariant) : variants;

    if (candidates.length === 0) {
        return variants[0]!;
    }

    return candidates[Math.floor(Math.random() * candidates.length)]!;
}

/**
 * Converts unknown prompt parameter values to string values required by prompt templates.
 */
function normalizePromptParameters(parameters: Record<string, unknown>): Record<string, string> {
    const normalizedEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(parameters)) {
        if (value === undefined || value === null) {
            continue;
        }

        if (typeof value === 'string') {
            normalizedEntries.push([key, value]);
            continue;
        }

        normalizedEntries.push([key, JSON.stringify(value)]);
    }

    return Object.fromEntries(normalizedEntries);
}

/**
 * LlmChat component that provides chat functionality with LLM integration
 *
 * This component internally manages messages, participants, and task progress,
 * and uses the provided LLM tools to generate responses via `LlmExecutionTools.callChatModel`.
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<LlmChat/>` connected to LLM Execution Tools of Promptbook
 *
 * @public exported from `@promptbook/components`
 */
export function LlmChat(props: LlmChatProps) {
    const {
        llmTools,
        persistenceKey,
        onChange,
        onReset,
        onError,
        initialMessages,
        sendMessage,
        userParticipantName = 'USER',
        llmParticipantName = 'ASSISTANT',
        autoExecuteMessage,
        buttonColor,
        toolTitles,
        thinkingMessages,
        promptParameters,
        chatFailMessage,
        resetMode = 'reset-current',
        ...restProps
    } = props;

    const resolvedPromptParameters = useMemo<Record<string, string>>(
        () => normalizePromptParameters(promptParameters ?? {}),
        [promptParameters],
    );

    const resolvedChatFailMessage = chatFailMessage || DEFAULT_CHAT_FAIL_MESSAGE;

    // Internal state management
    // DRY: Single factory for seeding initial messages (used on mount and after reset)
    const buildInitialMessages = useCallback(
        () =>
            initialMessages ? ([...initialMessages] satisfies Array<ChatMessage>) : ([] satisfies Array<ChatMessage>),
        [initialMessages],
    );
    const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages());
    const [tasksProgress, setTasksProgress] = useState<Array<{ id: string; name: string; progress?: number }>>([]);
    const [isVoiceCalling] = useState(false);
    const [teammates, setTeammates] = useState<TeammatesMap | undefined>(undefined);
    const [currentError, setCurrentError] = useState<FriendlyErrorMessage | null>(null);
    TODO_USE(currentError);

    const [lastFailedMessage, setLastFailedMessage] = useState<{
        content: string;
        attachments: ChatMessage['attachments'];
    } | null>(null);

    const streamingAbortControllerRef = useRef<AbortController | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    // Background recovery tracking for long-running responses interrupted by visibility changes.
    const requestInFlightRef = useRef(false);
    const backgroundedDuringRequestRef = useRef(false);
    const pendingBackgroundRecoveryRef = useRef<BackgroundRecoveryPayload | null>(null);
    const isBackgroundRecoveryRunningRef = useRef(false);
    const handleMessageRef = useRef<HandleMessageFn | null>(null);

    // Refs to keep latest state for long-lived handlers
    const messagesRef = useRef<ChatMessage[]>([]);
    const participantsRef = useRef<ReadonlyArray<ChatParticipant>>([]);
    const handleRetryRef = useRef<() => void>(() => {});

    /**
     * Tracks whether the user (or system via persistence restoration) has interacted.
     * We do NOT persist purely initialMessages until the user sends something.
     */
    const hasUserInteractedRef = useRef<boolean>(false);

    // Load persisted messages on component mount
    useEffect(() => {
        if (persistenceKey && ChatPersistence.isAvailable()) {
            const persistedMessages = ChatPersistence.loadMessages(persistenceKey);
            if (persistedMessages.length > 0) {
                setMessages(persistedMessages);
                hasUserInteractedRef.current = true; // Persisted conversation exists; allow saving next changes
            }
        }
    }, [persistenceKey]);

    // Save messages to localStorage whenever messages change (and persistence is enabled)
    useEffect(() => {
        if (persistenceKey && ChatPersistence.isAvailable() && messages.length > 0 && hasUserInteractedRef.current) {
            ChatPersistence.saveMessages(persistenceKey, messages);
        }
    }, [messages, persistenceKey]);

    // Generate participants from llmTools
    const participants = useMemo<ReadonlyArray<ChatParticipant>>(
        () =>
            props.participants || [
                {
                    name: userParticipantName,
                    fullname: 'You',
                    isMe: true,
                    color: '#1D4ED8',
                },
                // Use the profile from llmTools if available, otherwise fallback to default
                llmTools.profile || {
                    name: llmParticipantName,
                    fullname: llmTools.title || 'AI Assistant',
                    color: '#10b981',
                },
            ],
        [llmTools.profile, llmTools.title, props.participants, userParticipantName, llmParticipantName],
    );

    const thinkingVariants = useMemo<ReadonlyArray<string>>(() => {
        if (!thinkingMessages) {
            return DEFAULT_THINKING_MESSAGES;
        }

        const normalized = thinkingMessages
            .map((message) => message?.trim())
            .filter((message): message is string => Boolean(message));

        return normalized.length > 0 ? normalized : DEFAULT_THINKING_MESSAGES;
    }, [thinkingMessages]);

    // Load teammates metadata from llmTools
    useEffect(() => {
        const loadTeammates = async () => {
            // Check if llmTools has getModelRequirements method (AgentLlmExecutionTools)
            const llmToolsWithMetadata = llmTools as TODO_any;

            let resolvedTeammates: TeammatesMap | undefined;

            if (typeof llmToolsWithMetadata.getModelRequirements === 'function') {
                try {
                    const modelRequirements = await llmToolsWithMetadata.getModelRequirements();

                    if (modelRequirements?.metadata?.teammates && Array.isArray(modelRequirements.metadata.teammates)) {
                        resolvedTeammates = buildTeammatesMap(modelRequirements.metadata.teammates);
                    }
                } catch (error) {
                    console.warn('Failed to load teammates metadata:', error);
                }
            }

            if (!resolvedTeammates) {
                resolvedTeammates = buildTeammatesMapFromCapabilities(llmToolsWithMetadata.capabilities);
            }

            setTeammates(resolvedTeammates);
        };

        loadTeammates();
    }, [llmTools]);

    // Keep refs in sync for usage inside long-lived callbacks
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    // Notify about changes whenever messages or participants change
    // This replaces manual onChange calls to ensure consistency
    useEffect(() => {
        if (onChange) {
            onChange(messages, participants);
        }
    }, [messages, participants, onChange]);

    // Handle user messages and LLM responses
    const handleMessage = useCallback<HandleMessageFn>(
        async (messageContent, attachments = []) => {
            hasUserInteractedRef.current = true;
            requestInFlightRef.current = true;
            backgroundedDuringRequestRef.current = false;
            pendingBackgroundRecoveryRef.current = null;

            const userMessageCreatedAt = $getCurrentDate();
            const assistantMessageStartedAt = $getCurrentDate();

            // Add user message
            const userMessage: ChatMessage = {
                // channel: 'PROMPTBOOK_CHAT',
                id: `user_${Date.now()}`,
                createdAt: userMessageCreatedAt,
                sender: userParticipantName,
                content: messageContent as string_markdown,
                isComplete: true,
                attachments,
            };

            // Add loading message for assistant
            const thinkingVariant = getRandomThinkingVariant(thinkingVariants);
            const loadingMessage: ChatMessage = {
                // channel: 'PROMPTBOOK_CHAT',
                id: `assistant_${Date.now()}`,
                createdAt: assistantMessageStartedAt,
                sender: llmParticipantName,
                content: thinkingVariant as string_markdown,
                isComplete: false,
            };

            let thinkingRotationTimer: ReturnType<typeof setTimeout> | null = null;
            let isThinkingRotationActive = thinkingVariants.length > 1;
            let currentRotationVariant = thinkingVariant;

            const stopThinkingRotation = () => {
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

                    const nextVariant = getRandomThinkingVariant(thinkingVariants, currentRotationVariant);
                    currentRotationVariant = nextVariant;

                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === loadingMessage.id && !msg.isComplete
                                ? { ...msg, content: nextVariant as string_markdown }
                                : msg,
                        ),
                    );

                    scheduleNextThinkingVariant();
                }, getRandomThinkingDelayMs());
            };

            if (isThinkingRotationActive) {
                scheduleNextThinkingVariant();
            }

            // Functional update: Append both messages at once
            setMessages((prev) => [...prev, userMessage, loadingMessage]);

            // Add task progress for LLM call
            const taskId = `llm_call_${Date.now()}`;
            setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 0 }]);

            const generationStartedAtMs = Date.now();
            let streamingAbortController: AbortController | null = null;

            try {
                // Build thread: use props.thread if provided, otherwise use current messages + new user message
                // We filter out incomplete messages from the history to avoid including "Thinking..." from concurrent requests
                const currentHistory = messages.filter((m) => m.isComplete);
                const thread = props.thread ? [...props.thread] : [...currentHistory, userMessage];

                const prompt: Prompt = {
                    title: 'User Message',
                    content: messageContent as string_markdown,
                    parameters: resolvedPromptParameters,
                    modelRequirements: {
                        modelVariant: 'CHAT' as const,
                    },
                    thread,
                    attachments,
                };

                // Update task progress
                setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 50 }]);

                let result;

                if (llmTools.callChatModelStream) {
                    streamingAbortController = new AbortController();
                    streamingAbortControllerRef.current = streamingAbortController;
                    setIsStreaming(true);
                    result = await llmTools.callChatModelStream(
                        prompt,
                        (chunk) => {
                            stopThinkingRotation();
                            const assistantMessage: ChatMessage = {
                                // channel: 'PROMPTBOOK_CHAT',
                                id: loadingMessage.id,
                                createdAt: assistantMessageStartedAt,
                                sender: llmParticipantName,
                                content: chunk.content as string_markdown,
                                isComplete: false,
                                ongoingToolCalls: chunk.toolCalls,
                            };

                            // Functional update: Replace loading message with streaming update
                            setMessages((prev) =>
                                prev.map((msg) => (msg.id === loadingMessage.id ? assistantMessage : msg)),
                            );
                        },
                        { signal: streamingAbortController.signal },
                    );
                } else if (llmTools.callChatModel) {
                    result = await llmTools.callChatModel(prompt);
                } else {
                    throw new Error('LLM tools do not support chat model calls');
                }

                // Update task progress to complete
                setTasksProgress([{ id: taskId, name: 'Response generated', progress: 100 }]);

                if (!result.content.trim()) {
                    throw new Error('The agent did not respond.');
                }

                stopThinkingRotation();

                // Replace loading message with actual response
                const generationDurationMs = Date.now() - generationStartedAtMs;
                const assistantMessage: ChatMessage = {
                    // channel: 'PROMPTBOOK_CHAT',
                    id: loadingMessage.id,
                    createdAt: $getCurrentDate(),
                    sender: llmParticipantName,
                    content: result.content as string_markdown,
                    isComplete: true,
                    toolCalls: result.toolCalls,
                    completedToolCalls: result.toolCalls,
                    generationDurationMs,
                };

                // Functional update: Replace loading message with final response
                setMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? assistantMessage : msg)));

                // Clear task progress after a short delay
                setTimeout(() => {
                    setTasksProgress([]);
                }, 1000);
            } catch (error) {
                // Log raw error for debugging
                console.error('Error calling LLM:', error);

                stopThinkingRotation();

                if (streamingAbortController?.signal.aborted) {
                    setTasksProgress([]);
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === loadingMessage.id ? { ...msg, isComplete: true } : msg)),
                    );
                    return;
                }

                // Store the failed message for retry functionality
                setLastFailedMessage({ content: messageContent, attachments });

                if (backgroundedDuringRequestRef.current) {
                    pendingBackgroundRecoveryRef.current = { content: messageContent, attachments };
                    return;
                }

                // Call custom error handler if provided
                if (onError) {
                    onError(error, () => handleRetryRef.current(), { content: messageContent, attachments });
                }

                // Replace loading message with error message in chat
                const errorMessage: ChatMessage = {
                    // channel: 'PROMPTBOOK_CHAT',
                    id: loadingMessage.id,
                    createdAt: $getCurrentDate(),
                    sender: llmParticipantName,
                    content: resolvedChatFailMessage as string_markdown,
                    isComplete: true,
                    generationDurationMs: Date.now() - generationStartedAtMs,
                };

                // Functional update: Replace loading message with error
                setMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? errorMessage : msg)));

                // Clear task progress
                setTasksProgress([]);
            } finally {
                if (streamingAbortControllerRef.current === streamingAbortController) {
                    streamingAbortControllerRef.current = null;
                }
                setIsStreaming(false);
                requestInFlightRef.current = false;
            }
        },
        [
            messages,
            llmTools,
            props.thread,
            resolvedPromptParameters,
            onError,
            llmParticipantName,
            userParticipantName,
            thinkingVariants,
        ],
    );

    // Handle chat reset
    const handleReset = useCallback(async () => {
        if (resetMode === 'delegate' && onReset) {
            await onReset();
            return;
        }

        // Re-seed with initialMessages instead of empty array
        setMessages(buildInitialMessages());
        setTasksProgress([]);
        hasUserInteractedRef.current = false;

        // Clear error state
        setCurrentError(null);
        setLastFailedMessage(null);

        // Clear persisted messages if persistence is enabled
        if (persistenceKey && ChatPersistence.isAvailable()) {
            ChatPersistence.clearMessages(persistenceKey);
        }

        if (onReset) {
            await onReset();
        }
    }, [buildInitialMessages, onReset, persistenceKey, resetMode]);

    // Handle retry of last failed message
    const handleRetry = useCallback(() => {
        if (lastFailedMessage) {
            // Clear error state
            setCurrentError(null);

            // Retry sending the message
            handleMessage(lastFailedMessage.content, lastFailedMessage.attachments);
        }
    }, [lastFailedMessage, handleMessage]);

    const handleStopStreaming = useCallback(() => {
        const controller = streamingAbortControllerRef.current;
        if (!controller) {
            return;
        }

        controller.abort();
        setIsStreaming(false);
    }, []);

    // Keep handleRetry ref in sync
    useEffect(() => {
        handleRetryRef.current = handleRetry;
    }, [handleRetry]);

    // Keep handleMessage ref in sync so background recovery can re-trigger the latest handler.
    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    // Attempt to recover interrupted streams when the tab becomes visible again.
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
                document.visibilityState === 'visible' &&
                !requestInFlightRef.current &&
                !isBackgroundRecoveryRunningRef.current &&
                pendingBackgroundRecoveryRef.current &&
                handleMessageRef.current
            ) {
                const pending = pendingBackgroundRecoveryRef.current;
                pendingBackgroundRecoveryRef.current = null;
                isBackgroundRecoveryRunningRef.current = true;
                const nextRun = handleMessageRef.current(pending.content, pending.attachments);
                nextRun.finally(() => {
                    isBackgroundRecoveryRunningRef.current = false;
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Handle dismissing error dialog
    const handleDismissError = useCallback(() => {
        setCurrentError(null);
    }, []);

    TODO_USE(handleDismissError);

    // Attach internal handler to external sendMessage (from useSendMessageToLlmChat) if provided
    useEffect(() => {
        if (sendMessage && sendMessage._attach) {
            sendMessage._attach(handleMessage);
        }
    }, [sendMessage, handleMessage]);

    // Handle autoExecuteMessage
    const hasAutoExecutedRef = useRef(false);
    useEffect(() => {
        if (autoExecuteMessage && !hasAutoExecutedRef.current) {
            hasAutoExecutedRef.current = true;
            handleMessage(autoExecuteMessage);
        }
    }, [autoExecuteMessage, handleMessage]);

    const streamingStopAction = isStreaming ? (
        <button
            type="button"
            className={`${chatStyles.chatButton} ${chatStyles.stopButton}`}
            onClick={handleStopStreaming}
            aria-label="Stop streaming response"
            title="Stop streaming response"
        >
            <StopIcon size={16} />
            <span className={chatStyles.chatButtonText}>Stop</span>
        </button>
    ) : undefined;

    return (
        <>
            <Chat
                {...restProps}
                {...{ messages, onReset, tasksProgress, participants, buttonColor, toolTitles, teammates }}
                onMessage={handleMessage}
                onReset={handleReset}
                extraActions={streamingStopAction}
                isVoiceCalling={isVoiceCalling}
            />
        </>
    );
}
