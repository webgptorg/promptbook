'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_markdown } from '../../../types/typeAliases';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
/* Context removed – using attachable sendMessage from hook */
import { ChatPersistence } from '../utils/ChatPersistence';
import type { LlmChatProps } from './LlmChatProps';

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
    const [teammates, setTeammates] = useState<
        | Record<
              string,
              {
                  url: string;
                  label?: string;
                  instructions?: string;
                  toolName: string;
              }
          >
        | undefined
    >(undefined);

    // Refs to keep latest state for long-lived handlers
    const messagesRef = useRef<ChatMessage[]>([]);
    const participantsRef = useRef<ReadonlyArray<ChatParticipant>>([]);

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

    // Load teammates metadata from llmTools
    useEffect(() => {
        const loadTeammates = async () => {
            // Check if llmTools has getModelRequirements method (AgentLlmExecutionTools)
            const llmToolsWithMetadata = llmTools as TODO_any;

            if (typeof llmToolsWithMetadata.getModelRequirements !== 'function') {
                setTeammates(undefined);
                return;
            }

            try {
                const modelRequirements = await llmToolsWithMetadata.getModelRequirements();

                if (!modelRequirements?.metadata?.teammates || !Array.isArray(modelRequirements.metadata.teammates)) {
                    setTeammates(undefined);
                    return;
                }

                // Convert array to object keyed by toolName for easier lookup
                const teammatesMap: Record<
                    string,
                    {
                        url: string;
                        label?: string;
                        instructions?: string;
                        toolName: string;
                    }
                > = {};

                for (const teammate of modelRequirements.metadata.teammates as Array<{
                    url: string;
                    label?: string;
                    instructions?: string;
                    toolName: string;
                }>) {
                    if (teammate.toolName) {
                        teammatesMap[teammate.toolName] = teammate;
                    }
                }

                if (Object.keys(teammatesMap).length > 0) {
                    setTeammates(teammatesMap);
                } else {
                    setTeammates(undefined);
                }
            } catch (error) {
                console.warn('Failed to load teammates metadata:', error);
                setTeammates(undefined);
            }
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
                console.error('Error calling LLM:', error);

                // Replace loading message with error message
                const errorMessage: ChatMessage = {
                    // channel: 'PROMPTBOOK_CHAT',
                    id: loadingMessage.id,
                    createdAt: new Date(),
                    sender: llmParticipantName,
                    content: `Sorry, I encountered an error: ${
                        error instanceof Error ? error.message : 'Unknown error'
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
        [messages, llmTools, onChange, participants],
    );

    // Handle chat reset
    const handleReset = useCallback(async () => {
        // Re-seed with initialMessages instead of empty array
        setMessages(buildInitialMessages());
        setTasksProgress([]);
        hasUserInteractedRef.current = false;

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
                {...{ messages, onReset, tasksProgress, participants, buttonColor, toolTitles, teammates }}
                onMessage={handleMessage}
                onReset={handleReset}
                isVoiceCalling={isVoiceCalling}
            />
        </>
    );
}
