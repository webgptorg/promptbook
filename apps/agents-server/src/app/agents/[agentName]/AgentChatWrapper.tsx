'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ChatMessage } from '../../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../../src/book-components/Chat/types/ChatParticipant';
import { asUpdatableSubject } from '../../../../../../src/types/Updatable';
import { string_agent_url } from '../../../../../../src/types/typeAliases';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    agentSource: string_book;
    sourceVersion: number;
    onAgentLearned?: () => void;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const { agentUrl, agentSource, sourceVersion } = props;

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);

    // Track the source version when each message was created
    const messageSourceVersions = useRef<Map<string, number>>(new Map());
    const currentSourceVersionRef = useRef(sourceVersion);

    // Update the agent's source when it changes
    useEffect(() => {
        if (agent) {
            const agentSourceSubject = asUpdatableSubject(agent.agentSource);
            agentSourceSubject.next(agentSource);
        }
    }, [agent, agentSource]);

    // Update current source version ref
    useEffect(() => {
        currentSourceVersionRef.current = sourceVersion;
    }, [sourceVersion]);

    // Handle message changes to track their source versions
    const handleChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>, _participants: ReadonlyArray<ChatParticipant>) => {
            // Track source version for new messages
            messages.forEach((message) => {
                if (message.id && !messageSourceVersions.current.has(String(message.id))) {
                    messageSourceVersions.current.set(String(message.id), currentSourceVersionRef.current);
                }
            });
        },
        [],
    );

    // Wrap messages to mark them as outdated if needed
    const transformMessage = useCallback(
        (message: ChatMessage) => {
            const messageVersion = message.id ? messageSourceVersions.current.get(String(message.id)) : undefined;
            const isFromOutdatedSource =
                messageVersion !== undefined && messageVersion < currentSourceVersionRef.current;

            if (isFromOutdatedSource) {
                return {
                    ...message,
                    isFromOutdatedSource: true,
                };
            }
            return message;
        },
        [sourceVersion], // <- Re-create when sourceVersion changes to trigger re-render in LlmChat
    );

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

            if (props.onAgentLearned) {
                props.onAgentLearned();
            }
        },
        [agent, agentUrl, props],
    );

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <AgentChat
            className={`w-full h-full`}
            agent={agent}
            onChange={handleChange}
            transformMessage={transformMessage}
            onFeedback={handleFeedback}
        />
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
