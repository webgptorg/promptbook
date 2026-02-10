'use server';

import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { AgentChatOverlay } from '../AgentChatOverlay';
import { AgentProfileScene } from '../AgentProfileScene';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

/**
 * Renders the chat overlay while keeping the agent profile visible in the background.
 *
 * @param params - Route parameters provided by Next.js.
 * @param searchParams - Query parameters that may include the seed message or headless flag.
 * @returns The agent profile scene with chat overlay.
 * @public
 */
export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string; message?: string }>;
}) {
    const { headless: headlessParam, message } = await searchParams;
    const isHeadless = headlessParam !== undefined;
    const thinkingMessages = await getThinkingMessages();

    return (
        <AgentProfileScene
            params={params}
            isHeadless={isHeadless}
            overlay={({ agentName, agentUrl, brandColorHex, speechRecognitionLanguage }) => (
                <AgentChatOverlay
                    agentName={agentName}
                    agentUrl={agentUrl}
                    brandColor={brandColorHex}
                    thinkingMessages={thinkingMessages}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    autoExecuteMessage={message}
                />
            )}
        />
    );
}
