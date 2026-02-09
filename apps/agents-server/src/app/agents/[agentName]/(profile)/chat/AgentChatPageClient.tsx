'use client';

import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { AgentChatWrapper } from '../../AgentChatWrapper';
import { useAgentPageContext } from '../../AgentPageContext';

type AgentChatPageClientProps = {
    readonly autoExecuteMessage?: string;
};

export function AgentChatPageClient({ autoExecuteMessage }: AgentChatPageClientProps) {
    const { agentName, agentUrl, brandColor, thinkingMessages, speechRecognitionLanguage } = useAgentPageContext();

    return (
        <main className="w-full h-full overflow-hidden relative">
            <BackToAgentButton agentName={agentName} />
            <AgentChatWrapper
                agentUrl={agentUrl}
                autoExecuteMessage={autoExecuteMessage}
                brandColor={brandColor ?? undefined}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
            />
        </main>
    );
}
