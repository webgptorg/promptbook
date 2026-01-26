'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentCapability } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { string_markdown } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatPersistence } from '../utils/ChatPersistence';
import { createTeamToolNameFromUrl } from '../utils/createTeamToolNameFromUrl';
import type { LlmChatProps } from './LlmChatProps';
import type { FriendlyErrorMessage } from './FriendlyErrorMessage';

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

    return Object.keys( teammatesMap ).length > 0 ? teammatesMap : undefined;
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
 * LlmChat component that provides chat functionality with LLM integration
 *
 * This component internally manages messages, participants, and task progress,
 * and uses the provided LLM tools to generate responses via `LlmExecutionTools.callChatModel`.
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<AgentChat/>` connected to LLM Execution Tools of Promptbook
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
        ...restProps
    } = props;

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
                // Notify about loaded messages
                if (onChange) {
                    onChange(persistedMessages, participants);
                }
            }
        }
    }, [persistenceKey]); // Only depend on persistenceKey, not participants or onChange to avoid infinite loops

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
        [llmTools.profile, llmTools.title],
    );

    const knowledgeUrls = useMemo<ReadonlyArray<string> | undefined>(() => {
        const agentParticipant = participants.find((p) => p.agentSource);
        if (!agentParticipant?.agentSource) {
            return undefined;
        }

        const urls: string[] = [];
        const lines = agentParticipant.agentSource.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('KNOWLEDGE ')) {
                const source = trimmedLine.substring('KNOWLEDGE '.length).trim();
                if (source.startsWith('http://') || source.startsWith('https://')) {
                    urls.push(source);
                }
            }
        }

        return urls.length > 0 ? urls : undefined;
    }, [participants]);

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

    // Handle user messages and LLM responses
    const handleMessage = useCallback(
        async (messageContent: string, attachments: ChatMessage['attachments'] = []) => {
            hasUserInteractedRef.current = true;

            // Add user message
            const userMessage: ChatMessage = {
                // channel: 'PROMPTBOOK_CHAT',
                id: `user_${Date.now()}`,
                createdAt: new Date(),
                sender: userParticipantName,
                content: messageContent as string_markdown,
                isComplete: true,
                attachments,
            };

            const newMessages = [...messages, userMessage];
            setMessages(newMessages);

            // Notify about changes
            if (onChange) {
                onChange(newMessages, participants);
            }

            // Add loading message for assistant
            const loadingMessage: ChatMessage = {
                // channel: 'PROMPTBOOK_CHAT',
                id: `assistant_${Date.now()}`,
                createdAt: new Date(),
                sender: llmParticipantName,
                content: 'Thinking...' as string_markdown,
                isComplete: false,
            };

            const messagesWithLoading = [...newMessages, loadingMessage];
            setMessages(messagesWithLoading);

            // Notify about changes
            if (onChange) {
                onChange(newMessages, participants);
            }

            // Add task progress for LLM call
            const taskId = `llm_call_${Date.now()}`;
            setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 0 }]);

            try {
                // Build thread: use props.thread if provided, otherwise use current messages
                const thread = props.thread ? [...props.thread] : [...newMessages];
                const prompt = {
                    title: 'User Message',
                    content: messageContent as string_markdown,
                    parameters: {},
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
                    result = await llmTools.callChatModelStream(prompt, (chunk) => {
                        const assistantMessage: ChatMessage = {
                            // channel: 'PROMPTBOOK_CHAT',
                            id: loadingMessage.id,
                            createdAt: new Date(),
                            sender: llmParticipantName,
                            content: chunk.content as string_markdown,
                            isComplete: false,
                            ongoingToolCalls: chunk.toolCalls,
                        };

                        const currentMessages = [...newMessages, assistantMessage];
                        setMessages(currentMessages);

                        if (onChange) {
                            onChange(currentMessages, participants);
                        }
                    });
                } else if (llmTools.callChatModel) {
                    result = await llmTools.callChatModel(prompt);
                } else {
                    throw new Error('LLM tools do not support chat model calls');
                }

                // Update task progress to complete
                setTasksProgress([{ id: taskId, name: 'Response generated', progress: 100 }]);

                // Replace loading message with actual response
                const assistantMessage: ChatMessage = {
                    // channel: 'PROMPTBOOK_CHAT',
                    id: loadingMessage.id,
                    createdAt: new Date(),
                    sender: llmParticipantName,
                    content: result.content as string_markdown,
                    isComplete: true,
                    toolCalls: result.toolCalls,
                    completedToolCalls: result.toolCalls,
                };

                const finalMessages = [...newMessages, assistantMessage];
                setMessages(finalMessages);

                // Clear task progress after a short delay
                setTimeout(() => {
                    setTasksProgress([]);
                }, 1000);

                // Notify about changes
                if (onChange) {
                    onChange(finalMessages, participants);
                }
            } catch (error) {
                // Log raw error for debugging
                console.error('Error calling LLM:', error);

                // Store the failed message for retry functionality
                setLastFailedMessage({ content: messageContent, attachments });

                // Call custom error handler if provided
                if (onError) {
                    onError(error, () => handleRetryRef.current());
                }

                // Replace loading message with error message in chat
                const errorMessage: ChatMessage = {
                    // channel: 'PROMPTBOOK_CHAT',
                    id: loadingMessage.id,
                    createdAt: new Date(),
                    sender: llmParticipantName,
                    content: `Sorry, I encountered an error processing your message. ${
                        error instanceof Error ? error.message : 'Please try again.'
                    }` as string_markdown,
                    isComplete: true,
                };

                const finalMessages = [...newMessages, errorMessage];
                setMessages(finalMessages);

                // Clear task progress
                setTasksProgress([]);

                // Notify about changes
                if (onChange) {
                    onChange(finalMessages, participants);
                }
            }
        },
        [messages, llmTools, onChange, participants, onError, llmParticipantName, userParticipantName],
    );

    // Handle chat reset
    const handleReset = useCallback(async () => {
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

        // Notify about changes
        if (onChange) {
            onChange(buildInitialMessages(), participants);
        }
    }, [persistenceKey, onReset, onChange, participants, buildInitialMessages]);

    // Handle retry of last failed message
    const handleRetry = useCallback(() => {
        if (lastFailedMessage) {
            // Clear error state
            setCurrentError(null);

            // Retry sending the message
            handleMessage(lastFailedMessage.content, lastFailedMessage.attachments);
        }
    }, [lastFailedMessage, handleMessage]);

    // Keep handleRetry ref in sync
    useEffect(() => {
        handleRetryRef.current = handleRetry;
    }, [handleRetry]);

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

    return (
        <>
            <Chat
                {...restProps}
                {...{
                    messages,
                    onReset,
                    tasksProgress,
                    participants,
                    buttonColor,
                    toolTitles,
                    teammates,
                    knowledgeUrls,
                }}
                onMessage={handleMessage}
                onReset={handleReset}
                isVoiceCalling={isVoiceCalling}
            />
        </>
    );
}
