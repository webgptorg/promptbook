'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import spaceTrim from 'spacetrim';
import { string_agent_url, string_color } from '../../../../../../src/types/typeAliases';

type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    brandColorHex: string_color;
    avatarSrc: string;
};

export function AgentProfileChat({ agentUrl, agentName, fullname, brandColorHex, avatarSrc }: AgentProfileChatProps) {
    const router = useRouter();

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

    // If agent is not loaded yet, we can show a skeleton or just the default Chat structure
    // But to match "same initial message", we need the agent loaded or at least the default fallback.
    // The fallback above matches AgentChat.tsx default.

    return (
        <div className="w-full h-[400px] md:h-[500px]">
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
                        from: 'AGENT',
                        content: initialMessage,
                        date: new Date(),
                        id: 'initial-message',
                        isComplete: true,
                    },
                ]}
                onMessage={handleMessage}
                isSaveButtonEnabled={false}
                isCopyButtonEnabled={false}
                className="bg-transparent"
                buttonColor={brandColorHex}
                style={{ background: 'transparent' }}
            />
        </div>
    );
}
