'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { useCallback, useEffect, useMemo } from 'react';
import { string_agent_url } from '../../../../../../src/types/typeAliases';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const { agentUrl, defaultMessage, autoExecuteMessage } = props;

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

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <AgentChat
            className={`w-full h-full`}
            agent={agent}
            onFeedback={handleFeedback}
            defaultMessage={defaultMessage}
            autoExecuteMessage={autoExecuteMessage}
        />
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
