'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { upload } from '@vercel/blob/client';
import { useCallback, useEffect, useMemo } from 'react';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import { createDefaultSoundSystem } from '../../../utils/sound/createDefaultSoundSystem';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
    brandColor?: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const { agentUrl, defaultMessage, autoExecuteMessage, brandColor } = props;

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

    const handleFeedback = useCallback(
        async (feedback: {
            rating: number;
            textRating?: string;
            chatThread?: string;
            userNote?: string;
            expectedAnswer?: string | null;
        }) => {
            if (!agent) {
                return;
            }

            await fetch(`${agentUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: feedback.rating.toString(),
                    textRating: feedback.textRating,
                    chatThread: feedback.chatThread,
                    userNote: feedback.textRating, // Mapping textRating to userNote as well if needed, or just textRating
                    expectedAnswer: feedback.expectedAnswer,
                    agentHash: agent.agentHash,
                }),
            });
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
        const blob = await upload(file.name, file, {
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

    const soundSystem = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        return createDefaultSoundSystem();
    }, []);

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <AgentChat
            className={`w-full h-full`}
            style={{
                backgroundImage: `url("${backgroundImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
            agent={agent}
            onFeedback={handleFeedback}
            onFileUpload={handleFileUpload}
            defaultMessage={defaultMessage}
            autoExecuteMessage={autoExecuteMessage}
            speechRecognition={speechRecognition}
            visual="FULL_PAGE"
            effectConfigs={effectConfigs}
            soundSystem={soundSystem}
        />
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
