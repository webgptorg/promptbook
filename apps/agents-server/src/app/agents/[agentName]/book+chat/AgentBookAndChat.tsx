'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { string_agent_url, string_book } from '@promptbook-local/types';
import { useCallback, useState } from 'react';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { BookEditorWrapper } from '../book/BookEditorWrapper';

type AgentBookAndChatProps = {
    agentName: string;
    initialAgentSource: string_book;
    agentUrl: string_agent_url;
};

export function AgentBookAndChat(props: AgentBookAndChatProps) {
    const { agentName, initialAgentSource, agentUrl } = props;
    const [currentAgentSource, setCurrentAgentSource] = useState(initialAgentSource);

    const handleAgentLearned = useCallback(async () => {
        const response = await fetch(`/agents/${agentName}/api/book?t=${Date.now()}`, {
            cache: 'no-store',
        });
        const newAgentSource = (await response.text()) as string_book;
        setCurrentAgentSource(newAgentSource);
    }, [agentName]);

    return (
        <ResizablePanelsAuto name={`agent-book-and-chat-${agentName}`} className="w-full h-full">
            <BookEditorWrapper
                agentName={agentName}
                agentSource={currentAgentSource}
                onAgentSourceChange={setCurrentAgentSource}
            />
            <AgentChatWrapper agentUrl={agentUrl} onAgentLearned={handleAgentLearned} />
        </ResizablePanelsAuto>
    );
}
