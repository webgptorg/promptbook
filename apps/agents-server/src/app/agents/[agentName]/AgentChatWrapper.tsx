'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { upload } from '@vercel/blob/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
    brandColor?: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const { agentUrl, defaultMessage, autoExecuteMessage, brandColor, thinkingMessages, speechRecognitionLanguage } =
        props;

    const { backgroundImage } = useAgentBackground(brandColor);

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
    const [failedMessage, setFailedMessage] = useState<string | null>(null);

    // Chat reset state
    const [chatKey, setChatKey] = useState<number>(0);
    const [resetMessage, setResetMessage] = useState<string | undefined>(undefined);

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

            const payload = (await response.json().catch(() => null)) as { message?: string } | null;

            if (!response.ok) {
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
        const normalizedFilename = normalizeUploadFilename(file.name);
        const uploadPath = getSafeCdnPath({ pathname: normalizedFilename });
        const blob = await upload(uploadPath, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
        });

        return blob.url;
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

    // Handle errors from chat
    const handleError = useCallback((error: unknown, retry: () => void, failedMessage: { content: string }) => {
        const friendlyError = handleChatError(error, 'AgentChatWrapper');
        setCurrentError(friendlyError);
        setRetryCallback(() => retry);
        setFailedMessage(failedMessage.content);
    }, []);

    // Handle error dialog dismiss
    const handleDismissError = useCallback(() => {
        setCurrentError(null);
        setRetryCallback(null);
        setFailedMessage(null);
    }, []);

    // Handle retry from error dialog
    const handleRetry = useCallback(() => {
        if (retryCallback) {
            retryCallback();
        }
    }, [retryCallback]);

    // Handle reset from error dialog
    const handleReset = useCallback(() => {
        if (failedMessage) {
            setResetMessage(failedMessage);
            setChatKey((prevKey) => prevKey + 1); // Increment key to force re-mount
        }
    }, [failedMessage]);

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <>
            <AgentChat
                key={chatKey}
                className={`w-full h-full`}
                style={{
                    backgroundImage: `url("${backgroundImage}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
                agent={agent}
                onFeedback={handleFeedback}
                onFileUpload={handleFileUpload}
                onError={handleError}
                defaultMessage={defaultMessage}
                autoExecuteMessage={resetMessage || autoExecuteMessage}
                speechRecognition={speechRecognition}
                visual="FULL_PAGE"
                effectConfigs={effectConfigs}
                soundSystem={soundSystem}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
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
