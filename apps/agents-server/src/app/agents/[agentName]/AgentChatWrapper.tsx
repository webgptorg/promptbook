'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { useSelfLearningPreferences } from '../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import { reportClientVersionMismatch } from '../../../utils/clientVersionClient';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
    brandColor?: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    persistenceKey?: string;
    onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
    chatFailMessage?: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const {
        agentUrl,
        defaultMessage,
        autoExecuteMessage,
        brandColor,
        thinkingMessages,
        speechRecognitionLanguage,
        persistenceKey,
        onMessagesChange,
        chatFailMessage,
    } = props;

    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);

    const chatBackgroundStyle: CSSProperties & Record<string, string> = {
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '--agent-chat-brand-color': brandColorHex,
        '--agent-chat-brand-color-light': brandColorLightHex,
        '--agent-chat-brand-color-dark': brandColorDarkHex,
    };

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);

    // Error state management
    const [currentError, setCurrentError] = useState<FriendlyErrorMessage | null>(null);
    const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);
    const [chatKey, setChatKey] = useState<number>(0);

    const handleFeedback = useCallback(
        async (feedback: {
            message: ChatMessage;
            rating: number;
            textRating: string;
            chatThread: string;
            expectedAnswer: string | null;
            url: string;
        }): Promise<void> => {
            if (!agent) {
                throw new Error('Agent is not ready to receive feedback.');
            }

            const response = await fetch(`${agentUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: feedback.rating.toString(),
                    textRating: feedback.textRating,
                    chatThread: feedback.chatThread,
                    userNote: feedback.textRating,
                    expectedAnswer: feedback.expectedAnswer,
                    agentHash: agent.agentHash,
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(payload?.message ?? 'Failed to save feedback.');
            }
        },
        [agent, agentUrl],
    );

    // Remove the 'message' query parameter from URL after auto-executing a message
    useEffect(() => {
        if (autoExecuteMessage && typeof window !== 'undefined') {
            // Wait for the message to be processed, then remove the query parameter
            const timer = setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('message');
                window.history.replaceState({}, '', url.toString());
            }, 1000); // 1 second delay to ensure message processing is complete

            return () => clearTimeout(timer);
        }
    }, [autoExecuteMessage]);

    const handleFileUpload = useCallback(async (file: File) => {
        return chatFileUploadHandler(file);
    }, []);

    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        // Note: [🧠] We could have a mechanism to check if OPENAI_API_KEY is set on the server
        //       For now, we always provide OpenAiSpeechRecognition which uses proxy
        return new OpenAiSpeechRecognition();
    }, []);

    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();

    // Handle errors from chat
    const handleError = useCallback((error: unknown, retry: () => void) => {
        if (error instanceof ClientVersionMismatchError) {
            reportClientVersionMismatch({
                requiredVersion: error.requiredVersion,
                reportedVersion: error.reportedVersion,
                message: error.message,
            });
            return;
        }

        const friendlyError = handleChatError(error, 'AgentChatWrapper');
        setCurrentError(friendlyError);
        setRetryCallback(() => retry);
    }, []);

    // Handle error dialog dismiss
    const handleDismissError = useCallback(() => {
        setCurrentError(null);
        setRetryCallback(null);
    }, []);

    // Handle retry from error dialog
    const handleRetry = useCallback(() => {
        if (retryCallback) {
            retryCallback();
        }
    }, [retryCallback]);

    // Handle reset from error dialog
    const handleReset = useCallback(() => {
        setChatKey((prevKey) => prevKey + 1); // Increment key to force re-mount
    }, []);

    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);
        },
        [onMessagesChange],
    );

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <>
            <AgentChat
                key={chatKey}
                className={`w-full h-full`}
                style={chatBackgroundStyle}
                agent={agent}
                onFeedback={handleFeedback}
                onFileUpload={handleFileUpload}
                onError={handleError}
                defaultMessage={defaultMessage}
                autoExecuteMessage={autoExecuteMessage}
                persistenceKey={persistenceKey}
                onChange={handleMessagesChange}
                speechRecognition={speechRecognition}
                visual="FULL_PAGE"
                effectConfigs={effectConfigs}
                soundSystem={soundSystem}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                chatFailMessage={chatFailMessage}
                promptParameters={{ selfLearningEnabled: isSelfLearningEnabled }}
            />
            <ChatErrorDialog
                error={currentError}
                onRetry={handleRetry}
                onReset={handleReset}
                onDismiss={handleDismissError}
            />
        </>
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
