'use client';

import { useCallback, useMemo, useState } from 'react';
import type { string_markdown, string_name } from '../../../types/typeAliases';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { LlmChatProps } from './LlmChatProps';

/**
 * LlmChat component that provides chat functionality with LLM integration
 *
 * This component internally manages messages, participants, and task progress,
 * and uses the provided LLM tools to generate responses via callChatModel.
 *
 * Note: There are multiple chat components:
 * - <Chat/> renders chat as it is without any logic
 * - <SimpleChat/> with callback function after each message 🔵->🟢->🔵->🟢->🔵->🟢->...
 * - <WorkerChat/> with continuously running worker function on background which binds on dialogues queue  🔵->🟢->🔵->🟢->🔵->🟢->...
 * - <SignalChat/> fully controlled by signal that is passed in 🔵->🟢->🟢->🟢->🔵->🟢->...
 * - <LlmChat/> connected to LLM Execution Tools of Promptbook
 * - <AgentChat/> direct OpenAI API integration with streaming responses and model selection
 * - <ChatbotMiniapp/> Fully working chatbot miniapp created from book
 * - <AssistantChatPage/> page for assistant chat with welcome message and avatar
 * - <ModelAwareChat/> wrapper around <Chat/> that provides model-aware avatars
 *
 * @public exported from `@promptbook/components`
 */
export function LlmChat(props: LlmChatProps) {
    const { llmTools, onChange, onReset, ...restProps } = props;

    // Internal state management
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [tasksProgress, setTasksProgress] = useState<Array<{ id: string; name: string; progress?: number }>>([]);

    // Generate participants from llmTools
    const participants = useMemo<Array<ChatParticipant>>(
        () => [
            {
                name: 'USER' as string_name,
                fullname: 'You',
                isMe: true,
                color: '#3b82f6',
            },
            {
                name: 'ASSISTANT' as string_name,
                fullname: llmTools.title || 'AI Assistant',
                color: '#10b981',
                // Note: Could add avatar based on llmTools if available
            },
        ],
        [],
    );

    // Handle user messages and LLM responses
    const handleMessage = useCallback(
        async (messageContent: string) => {
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

        if (onReset) {
            await onReset();
        }

        // Notify about changes
        if (onChange) {
            onChange([], participants);
        }
    }, [onReset, onChange, participants]);

    return (
        <Chat
            {...restProps}
            {...{ messages, onReset, tasksProgress, participants }}
            onMessage={handleMessage}
            onReset={onReset ? handleReset : undefined}
        />
    );
}
