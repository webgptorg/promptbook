'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import spaceTrim from 'spacetrim';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url, string_color } from '../../../../../../src/types/typeAliases';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $createAgentFromBookAction } from '../../../app/actions';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';

type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    brandColorHex: string_color;
    avatarSrc: string;
    isDeleted?: boolean;
};

export function AgentProfileChat({
    agentUrl,
    agentName,
    fullname,
    brandColorHex,
    avatarSrc,
    isDeleted = false,
}: AgentProfileChatProps) {
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);

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
            // Redirect to chat page with the message
            router.push(`/agents/${encodeURIComponent(agentName)}/chat?message=${encodeURIComponent(message)}`);
        },
        [agentName, router],
    );

    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        // Note: [🧠] We could have a mechanism to check if OPENAI_API_KEY is set on the server
        //       For now, we always provide OpenAiSpeechRecognition which uses proxy
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
                alert('Failed to create agent. Please try again.');
            } finally {
                setIsCreatingAgent(false);
            }
        },
        [router],
    );

    const initialMessage = useMemo(() => {
        if (!agent) {
            return 'Loading...';
        }
        return (
            agent.initialMessage ||
            spaceTrim(`
                Hello! I am ${fullname || agentName || 'an AI Agent'}.
                
                [Hello](?message=Hello, can you tell me about yourself?)
            `)
        );
    }, [agent, fullname, agentName]);

    // If agent is deleted, show banner instead of chat
    if (isDeleted) {
        return (
            <div className="w-full min-h-[350px] md:min-h-[500px] flex items-center justify-center">
                <DeletedAgentBanner message="This agent has been deleted. You can restore it from the Recycle Bin." />
            </div>
        );
    }

    // If agent is not loaded yet, we can show a skeleton or just the default Chat structure
    // But to match "same initial message", we need the agent loaded or at least the default fallback.
    // The fallback above matches AgentChat.tsx default.

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
                        // <- TODO: [🧠] Maybe this shouldnt be there
                    },
                ]}
                messages={[
                    {
                        sender: 'AGENT',
                        content: initialMessage,
                        createdAt: new Date(),
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
            />
        </div>
    );
}
