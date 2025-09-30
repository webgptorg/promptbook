'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_markdown, string_name } from '../../../types/typeAliases';
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
    const { llmTools, persistenceKey, onChange, onReset, initialMessages, sendMessage, ...restProps } = props;

    // Internal state management
    const [messages, setMessages] = useState<ChatMessage[]>(() => (initialMessages ? [...initialMessages] : []));
    const [tasksProgress, setTasksProgress] = useState<Array<{ id: string; name: string; progress?: number }>>([]);

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
    const participants = useMemo<Array<ChatParticipant>>(
        () => [
            {
                name: 'USER' as string_name,
                fullname: 'You',
                isMe: true,
                color: '#1D4ED8',
            },
            // Use the profile from llmTools if available, otherwise fallback to default
            llmTools.profile || {
                name: 'ASSISTANT' as string_name,
                fullname: llmTools.title || 'AI Assistant',
                color: '#10b981',
            },
        ],
        [llmTools.profile, llmTools.title],
    );

    // Handle user messages and LLM responses
    const handleMessage = useCallback(
        async (messageContent: string) => {
            hasUserInteractedRef.current = true;

            // Add user message
            const userMessage: ChatMessage = {
                id: `user_${Date.now()}`,
                date: new Date(),
                from: 'USER' as string_name,
                content: messageContent as string_markdown,
                isComplete: true,
            };

            const newMessages = [...messages, userMessage];
            setMessages(newMessages);

            // Notify about changes
            if (onChange) {
                onChange(newMessages, participants);
            }

            // Add loading message for assistant
            const loadingMessage: ChatMessage = {
                id: `assistant_${Date.now()}`,
                date: new Date(),
                from: 'ASSISTANT' as string_name,
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
                // Call LLM using callChatModel
                if (!llmTools.callChatModel) {
                    throw new Error('LLM tools do not support chat model calls');
                }

                // Update task progress
                setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 50 }]);

                const result = await llmTools.callChatModel({
                    title: 'User Message',
                    content: messageContent as string_markdown,
                    parameters: {},
                    modelRequirements: {
                        modelVariant: 'CHAT',
                    },
                });

                // Update task progress to complete
                setTasksProgress([{ id: taskId, name: 'Response generated', progress: 100 }]);

                // Replace loading message with actual response
                const assistantMessage: ChatMessage = {
                    id: loadingMessage.id,
                    date: new Date(),
                    from: 'ASSISTANT' as string_name,
                    content: result.content as string_markdown,
                    isComplete: true,
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
                    id: loadingMessage.id,
                    date: new Date(),
                    from: 'ASSISTANT' as string_name,
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
        setMessages([]);
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
            onChange([], participants);
        }
    }, [persistenceKey, onReset, onChange, participants]);

    // Attach internal handler to external sendMessage (from useSendMessageToLlmChat) if provided
    useEffect(() => {
        if (sendMessage && sendMessage._attach) {
            sendMessage._attach(handleMessage);
        }
    }, [sendMessage, handleMessage]);

    return (
        <Chat
            {...restProps}
            {...{ messages, onReset, tasksProgress, participants }}
            onMessage={handleMessage}
            onReset={handleReset}
        />
    );
}
