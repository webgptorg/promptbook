'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_markdown } from '../../../types/typeAliases';
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
        ...restProps
    } = props;

    // Internal state management
    // DRY: Single factory for seeding initial messages (used on mount and after reset)
    const buildInitialMessages = useCallback(
        () => (initialMessages ? ([...initialMessages] as ChatMessage[]) : ([] as ChatMessage[])),
        [initialMessages],
    );
    const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages());
    const [tasksProgress, setTasksProgress] = useState<Array<{ id: string; name: string; progress?: number }>>([]);
    const [isVoiceCalling, setIsVoiceCalling] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // Refs to keep latest state for long-lived voice handlers
    const messagesRef = useRef<ChatMessage[]>([]);
    const participantsRef = useRef<ReadonlyArray<ChatParticipant>>([]);
    const isProcessingVoiceChunkRef = useRef<boolean>(false);
    const allVoiceChunksRef = useRef<Blob[]>([]);
    const utteranceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Keep refs in sync for usage inside long-lived callbacks
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    // Handle voice input in a fluent, multi-message way:
    // - While the call is active we keep recording audio.
    // - When the user is silent for ~2 seconds, we treat it as the end of an utterance
    //   and send one combined audio blob to the agent (one agent turn per utterance).
    const processCurrentUtterance = useCallback(async () => {
        if (!llmTools.callVoiceChatModel) {
            return;
        }

        if (isProcessingVoiceChunkRef.current) {
            return;
        }

        const chunks = allVoiceChunksRef.current;
        if (!chunks.length) {
            return;
        }

        isProcessingVoiceChunkRef.current = true;
        allVoiceChunksRef.current = [];

        const blob = new Blob(chunks, {
            type: chunks[0]?.type || 'audio/webm',
        });

        const taskId = `voice_call_${Date.now()}`;
        setTasksProgress([{ id: taskId, name: 'Processing voice...', progress: 50 }]);

        try {
            const thread = props.thread ? [...props.thread] : [...messagesRef.current];

            const result = await llmTools.callVoiceChatModel(blob, {
                title: 'Voice Message',
                content: '',
                parameters: {},
                modelRequirements: { modelVariant: 'CHAT' as const },
                thread,
            });

            setTasksProgress([{ id: taskId, name: 'Playing response...', progress: 100 }]);

            const now = Date.now();

            const userMessage: ChatMessage = {
                id: `user_${now}`,
                date: new Date(),
                from: userParticipantName,
                content: (result.userMessage || '(Voice message)') as string_markdown,
                isComplete: true,
                isVoiceCall: true,
            };

            const agentMessage: ChatMessage = {
                id: `agent_${now}`,
                date: new Date(),
                from: llmParticipantName,
                content: (result.agentMessage || result.text) as string_markdown,
                isComplete: true,
                isVoiceCall: true,
            };

            setMessages((prevMessages) => {
                const newMessages = [...prevMessages, userMessage, agentMessage];
                messagesRef.current = newMessages;

                if (onChange) {
                    onChange(newMessages, participantsRef.current);
                }

                return newMessages;
            });

            // Play audio
            const audioUrl = URL.createObjectURL(result.audio);
            const audioEl = new Audio(audioUrl);
            audioEl.play();

            setTimeout(() => setTasksProgress([]), 1000);
        } catch (error) {
            console.error('Error calling Voice LLM:', error);
            setTasksProgress([]);
        } finally {
            isProcessingVoiceChunkRef.current = false;
        }
    }, [llmTools, onChange, userParticipantName, llmParticipantName, props.thread]);

    const handleVoiceInput = useCallback(async () => {
        if (!llmTools.callVoiceChatModel) {
            return;
        }

        if (isVoiceCalling) {
            // Stop recording and end call
            const recorder = mediaRecorderRef.current;
            if (recorder) {
                recorder.stop();
            }
            mediaRecorderRef.current = null;
            setIsVoiceCalling(false);

            // Process any remaining audio as the final utterance
            if (utteranceTimeoutRef.current) {
                clearTimeout(utteranceTimeoutRef.current);
                utteranceTimeoutRef.current = null;
            }
            void processCurrentUtterance();
        } else {
            // Start recording and keep listening for utterances separated by ~2s of silence
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;

                allVoiceChunksRef.current = [];
                isProcessingVoiceChunkRef.current = false;
                if (utteranceTimeoutRef.current) {
                    clearTimeout(utteranceTimeoutRef.current);
                    utteranceTimeoutRef.current = null;
                }

                mediaRecorder.ondataavailable = (event) => {
                    const chunk = event.data;
                    if (!chunk || chunk.size === 0) {
                        return;
                    }

                    // Accumulate chunks for the current utterance
                    allVoiceChunksRef.current.push(chunk);

                    // Reset the silence timer; if there is no new audio for 2s,
                    // treat it as the end of the current utterance.
                    if (utteranceTimeoutRef.current) {
                        clearTimeout(utteranceTimeoutRef.current);
                    }
                    utteranceTimeoutRef.current = setTimeout(() => {
                        void processCurrentUtterance();
                    }, 2000);
                };

                mediaRecorder.onstop = () => {
                    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
                    if (utteranceTimeoutRef.current) {
                        clearTimeout(utteranceTimeoutRef.current);
                        utteranceTimeoutRef.current = null;
                    }
                    // Process any remaining audio when the recorder stops
                    void processCurrentUtterance();
                };

                // Use timeslices so ondataavailable is fired continuously
                mediaRecorder.start(500);
                setIsVoiceCalling(true);
            } catch (err) {
                console.error('Error accessing microphone:', err);
            }
        }
    }, [isVoiceCalling, llmTools, processCurrentUtterance]);

    // Handle user messages and LLM responses
    const handleMessage = useCallback(
        async (messageContent: string) => {
            hasUserInteractedRef.current = true;

            // Add user message
            const userMessage: ChatMessage = {
                id: `user_${Date.now()}`,
                date: new Date(),
                from: userParticipantName,
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
                from: llmParticipantName,
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
                };

                // Update task progress
                setTasksProgress([{ id: taskId, name: 'Generating response...', progress: 50 }]);

                let result;

                if (llmTools.callChatModelStream) {
                    result = await llmTools.callChatModelStream(prompt, (chunk) => {
                        const assistantMessage: ChatMessage = {
                            id: loadingMessage.id,
                            date: new Date(),
                            from: llmParticipantName,
                            content: chunk.content as string_markdown,
                            isComplete: false,
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
                    id: loadingMessage.id,
                    date: new Date(),
                    from: llmParticipantName,
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
                    from: llmParticipantName,
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

    return (
        <Chat
            {...restProps}
            {...{ messages, onReset, tasksProgress, participants }}
            onMessage={handleMessage}
            onReset={handleReset}
            onVoiceInput={llmTools.callVoiceChatModel ? handleVoiceInput : undefined}
            isVoiceCalling={isVoiceCalling}
        />
    );
}
