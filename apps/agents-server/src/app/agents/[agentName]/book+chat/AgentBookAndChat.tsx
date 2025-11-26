'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { string_agent_url, string_book } from '@promptbook-local/types';
import { BookEditorWrapper } from '../book/BookEditorWrapper';
import { AgentChatWrapper } from '../AgentChatWrapper';

type AgentBookAndChatProps = {
    agentName: string;
    initialAgentSource: string_book;
    agentUrl: string_agent_url;
};

export function AgentBookAndChat(props: AgentBookAndChatProps) {
    const { agentName, initialAgentSource, agentUrl } = props;

    return (
        <ResizablePanelsAuto name={`agent-book-and-chat-${agentName}`} className="w-full h-full">
            <BookEditorWrapper agentName={agentName} initialAgentSource={initialAgentSource} />
            <AgentChatWrapper agentUrl={agentUrl} />
        </ResizablePanelsAuto>
    );
}
