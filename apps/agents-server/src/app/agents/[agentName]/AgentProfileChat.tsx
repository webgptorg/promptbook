'use client';

import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import spaceTrim from 'spacetrim';
import { useCallback, useMemo } from 'react';
import { usePromise } from '@common/hooks/usePromise';
import { useRouter } from 'next/navigation';
import { string_agent_url } from '../../../../../../src/types/typeAliases';

type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
};

export function AgentProfileChat({ agentUrl, agentName, fullname }: AgentProfileChatProps) {
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
                messages={[
                    {
                        from: 'AGENT',
                        content: initialMessage,
                        date: new Date(),
                        id: 'initial-message',
                        isComplete: true
                    },
                ]}
                onMessage={handleMessage}
                isSaveButtonEnabled={false}
                isCopyButtonEnabled={false}
                className="bg-transparent"
                style={{ background: 'transparent' }}
            />
        </div>
    );
}
