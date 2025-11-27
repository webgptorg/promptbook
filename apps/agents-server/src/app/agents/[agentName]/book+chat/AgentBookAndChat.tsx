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
    const [sourceVersion, setSourceVersion] = useState(0);

    const handleAgentSourceChange = useCallback((newSource: string_book) => {
        setCurrentAgentSource(newSource);
        // Increment version to mark existing messages as outdated
        setSourceVersion((prev) => prev + 1);
    }, []);

    const handleAgentLearned = useCallback(async () => {
        const response = await fetch(`/agents/${agentName}/api/book?t=${Date.now()}`, {
            cache: 'no-store',
        });
        const newAgentSource = (await response.text()) as string_book;
        handleAgentSourceChange(newAgentSource);
    }, [agentName, handleAgentSourceChange]);

    return (
        <ResizablePanelsAuto name={`agent-book-and-chat-${agentName}`} className="w-full h-full">
            <BookEditorWrapper
                agentName={agentName}
                agentSource={currentAgentSource}
                onAgentSourceChange={handleAgentSourceChange}
            />
            <AgentChatWrapper
                agentUrl={agentUrl}
                agentSource={currentAgentSource}
                sourceVersion={sourceVersion}
                onAgentLearned={handleAgentLearned}
            />
        </ResizablePanelsAuto>
    );
}
