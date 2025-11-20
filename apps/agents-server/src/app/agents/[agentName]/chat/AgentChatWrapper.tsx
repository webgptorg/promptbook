'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { useMemo } from 'react';
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

    if (!agent) {
        return <>{/* <- TODO: !!! <PromptbookLoading /> */}</>;
    }

    return <AgentChat className={`w-full h-full`} agent={agent} />;
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
