'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { useCallback, useMemo } from 'react';
import { string_agent_url } from '../../../../../../../src/types/typeAliases';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
};

// TODO: !!!! Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const { agentUrl } = props;

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

    if (!agent) {
        return <>{/* <- TODO: !!! <PromptbookLoading /> */}</>;
    }

    return <AgentChat className={`w-full h-full`} agent={agent} onFeedback={handleFeedback} />;
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
