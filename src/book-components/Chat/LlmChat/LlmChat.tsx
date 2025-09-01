'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import type { Promisable } from 'type-fest';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { string_markdown } from '../../../types/typeAliases';
import type { string_name } from '../../../types/typeAliases';
import { Chat } from '../Chat/Chat';
import type { ChatMessage } from '../interfaces/ChatMessage';
import type { ChatParticipant } from '../interfaces/ChatParticipant';

/**
 * Props for LlmChat component, derived from ChatProps but with LLM-specific modifications
 *
 * @public exported from `@promptbook/components`
 */
export interface LlmChatProps {
    /**
     * LLM execution tools for chatting with the model
     */
    readonly llmTools: LlmExecutionTools;

    /**
     * Called when the chat state changes (messages, participants, etc.)
     */
    onChange?(messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>): void;

    /**
     * Optional callback, when set, button for resetting chat will be shown
     */
    onReset?(): Promisable<void>;

    /**
     * Determines whether the voice recognition button is rendered
     */
    readonly isVoiceRecognitionButtonShown?: boolean;

    /**
     * The language code to use for voice recognition
     */
    readonly voiceLanguage?: string;

    /**
     * Optional placeholder message for the textarea
     *
     * @default "Write a message"
     */
    readonly placeholderMessageContent?: string;

    /**
     * Optional preset message in chat
     */
    readonly defaultMessage?: string;

    /**
     * Content to be shown inside the chat bar in head
     * If not provided, the chat bar will not be rendered
     */
    readonly children?: ReactNode;

    /**
     * Optional CSS class name which will be added to root <div/> element
     */
    readonly className?: string;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;

    /**
     * Voice call props - when provided, voice call button will be shown
     */
    readonly voiceCallProps?: {
        selectedModel: string;
        providerClients: Map<string, unknown>;
        currentPersonaContent?: string;
        onVoiceMessage?: (content: string, isVoiceCall: boolean) => void;
        onAssistantVoiceResponse?: (content: string, isVoiceCall: boolean) => void;
        onVoiceCallStateChange?: (isVoiceCalling: boolean) => void;
    };

    /**
     * Indicates whether a voice call is currently active
     */
    readonly isVoiceCalling?: boolean;

    /**
     * Whether experimental features are enabled (required for voice calling)
     */
    readonly isExperimental?: boolean;

    /**
     * Whether the save button is enabled and shown
     */
    readonly isSaveButtonEnabled?: boolean;

    /**
     * Optional markdown header to include at the top of exported files.
     * Example: "## Discussion Topic\n\nSome topic here"
     */
    readonly exportHeaderMarkdown?: string;

    /**
     * Optional callback to create a new agent from the template.
     * If provided, renders the [Use this template] button.
     */
    onUseTemplate?(): void;
}

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
    const {
        llmTools,
        onChange,
        onReset,
        isVoiceRecognitionButtonShown,
        voiceLanguage,
        placeholderMessageContent,
        defaultMessage,
        children,
        className,
        style,
        voiceCallProps,
        isVoiceCalling,
        isExperimental,
        isSaveButtonEnabled,
        exportHeaderMarkdown,
        onUseTemplate,
    } = props;

    // Internal state management
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [tasksProgress, setTasksProgress] = useState<Array<{ id: string; name: string; progress?: number }>>([]);

    // Generate participants from llmTools
    const participants: ChatParticipant[] = [
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
    ];

    // Handle user messages and LLM responses
    const handleMessage = useCallback(async (messageContent: string) => {
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
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}` as string_markdown,
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
    }, [messages, llmTools, onChange, participants]);

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
            messages={messages}
            participants={participants}
            onMessage={handleMessage}
            onReset={onReset ? handleReset : undefined}
            tasksProgress={tasksProgress}
            isVoiceRecognitionButtonShown={isVoiceRecognitionButtonShown}
            voiceLanguage={voiceLanguage}
            placeholderMessageContent={placeholderMessageContent}
            defaultMessage={defaultMessage}
            children={children}
            className={className}
            style={style}
            voiceCallProps={voiceCallProps}
            isVoiceCalling={isVoiceCalling}
            isExperimental={isExperimental}
            isSaveButtonEnabled={isSaveButtonEnabled}
            exportHeaderMarkdown={exportHeaderMarkdown}
            onUseTemplate={onUseTemplate}
        />
    );
}
