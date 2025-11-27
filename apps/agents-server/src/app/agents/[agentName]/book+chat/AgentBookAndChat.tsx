'use client';

import { usePromise } from '@common/hooks/usePromise';
import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { RemoteAgent } from '@promptbook-local/core';
import { string_agent_url, string_book } from '@promptbook-local/types';
import { useEffect, useMemo, useState } from 'react';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { BookEditorWrapper } from '../book/BookEditorWrapper';

type AgentBookAndChatProps = {
    agentName: string;
    initialAgentSource: string_book;
    agentUrl: string_agent_url;
};

export function AgentBookAndChat(props: AgentBookAndChatProps) {
    const { agentName, initialAgentSource, agentUrl } = props;

    const agentPromise = useMemo(async () => {
        const agent = await RemoteAgent.connect({
            agentUrl,
            isVerbose: true,
        });

        // Note: We want to use the initialAgentSource we already have
        //       (RemoteAgent initializes with a dummy source)
        if (initialAgentSource) {
            agent.agentSource.next(initialAgentSource);
        }

        return agent;
    }, [agentUrl, initialAgentSource]);

    const { value: agent } = usePromise(agentPromise, [agentPromise]);
    const [agentSource, setAgentSource] = useState<string_book>(initialAgentSource);

    useEffect(() => {
        if (!agent) {
            return;
        }

        const subscription = agent.agentSource.subscribe(setAgentSource);
        return () => subscription.unsubscribe();
    }, [agent]);

    return (
        <ResizablePanelsAuto name={`agent-book-and-chat-${agentName}`} className="w-full h-full">
            <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />
            <AgentChatWrapper agentUrl={agentUrl} agent={agent || undefined} />
        </ResizablePanelsAuto>
    );
}
