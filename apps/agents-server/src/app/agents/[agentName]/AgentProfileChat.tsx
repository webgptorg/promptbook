'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import spaceTrim from 'spacetrim';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { $getCurrentDate } from '../../../../../../src/utils/misc/$getCurrentDate';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $createAgentFromBookAction } from '../../../app/actions';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { useAgentPageContext } from './AgentPageContext';

export function AgentProfileChat() {
    const { agentUrl, agentName, fullname, brandColorHex, avatarSrc, speechRecognitionLanguage } = useAgentPageContext();
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const { formatText } = useAgentNaming();

    keepUnused(isCreatingAgent);

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);

    const handleMessage = useCallback(
        async (message: string) => {
            router.push(`/agents/${encodeURIComponent(agentName)}/chat?message=${encodeURIComponent(message)}`);
        },
        [agentName, router],
    );

    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        return new OpenAiSpeechRecognition();
    }, []);

    const handleCreateAgent = useCallback(
        async (bookContent: string) => {
            setIsCreatingAgent(true);
            try {
                const { permanentId } = await $createAgentFromBookAction(bookContent as string_book);
                if (permanentId) {
                    router.push(`/agents/${permanentId}`);
                }
            } catch (error) {
                console.error('Failed to create agent:', error);
                await showAlert({
                    title: 'Create failed',
                    message: formatText('Failed to create agent. Please try again.'),
                }).catch(() => undefined);
            } finally {
                setIsCreatingAgent(false);
            }
        },
        [formatText, router],
    );

    const initialMessage = useMemo(() => {
        if (!agent) {
            return 'Loading...';
        }
        const fallbackName = formatText('an AI Agent');
        return (
            agent.initialMessage ||
            spaceTrim(`
                Hello! I am ${fullname || agentName || fallbackName}.
                
                [Hello](?message=Hello, can you tell me about yourself?)
            `)
        );
    }, [agent, fullname, agentName, formatText]);

    return (
        <div className="w-full h-[calc(100dvh-300px)] min-h-[350px] md:h-[500px]">
            <Chat
                title={`Chat with ${fullname}`}
                participants={[
                    {
                        name: 'AGENT',
                        fullname,
                        isMe: false,
                        color: brandColorHex,
                        avatarSrc,
                    },
                ]}
                messages={[
                    {
                        sender: 'AGENT',
                        content: initialMessage,
                        createdAt: $getCurrentDate(),
                        id: 'initial-message',
                        isComplete: true,
                    },
                ]}
                onMessage={handleMessage}
                onCreateAgent={handleCreateAgent}
                isSaveButtonEnabled={false}
                isCopyButtonEnabled={false}
                className="bg-transparent"
                buttonColor={brandColorHex}
                style={{ background: 'transparent' }}
                speechRecognition={speechRecognition}
                speechRecognitionLanguage={speechRecognitionLanguage}
                visual={'STANDALONE'}
            />
        </div>
    );
}
