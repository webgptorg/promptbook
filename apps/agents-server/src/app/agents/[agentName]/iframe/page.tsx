'use server';

import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { AgentChatHistoryClient } from '../chat/AgentChatHistoryClient';
import { getAgentName, getAgentProfile, isAgentDeleted, parseBooleanFlag } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { resolveAgentRouteTarget } from '../../../../utils/agentRouting/resolveAgentRouteTarget';

export const generateMetadata = generateAgentMetadata;

/**
 * Renders the iframe-friendly chat page for embedding an agent.
 */
/**
 * Serves the iframe-friendly agent chat experience for embedding on other websites.
 */
export default async function AgentIframePage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string; chat?: string; newChat?: string }>;
}) {
    const requestHeaders = await headers();
    const agentName = await getAgentName(params);
    const routeTarget = await resolveAgentRouteTarget(agentName);

    if (!routeTarget) {
        notFound();
    }

    if (routeTarget.kind === 'remote') {
        redirect(routeTarget.url);
    }

    if (routeTarget.kind === 'pseudo') {
        redirect(routeTarget.canonicalUrl);
    }

    const canonicalAgentId = routeTarget.canonicalAgentId;
    if (agentName !== canonicalAgentId) {
        redirect(`/agents/${encodeURIComponent(canonicalAgentId)}/iframe`);
    }

    const { message, chat, newChat } = await searchParams;
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });

    const isDeleted = await isAgentDeleted(canonicalAgentId);
    if (isDeleted) {
        return (
            <main className="agents-server-viewport-width h-full flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const agentProfile = await getAgentProfile(canonicalAgentId);
    const agentUrl = `/agents/${encodeURIComponent(canonicalAgentId)}`;
    const thinkingMessages = await getThinkingMessages();
    const historyIdentityAvailable = await ensureChatHistoryIdentity();
    const { chatFailMessage, isFileAttachmentsEnabled, isFeedbackEnabled } = await loadChatConfiguration();

    return (
        <main className="w-full h-full overflow-hidden relative agent-chat-route-surface print-export-chat-surface">
            <AgentChatHistoryClient
                agentName={canonicalAgentId}
                agentUrl={agentUrl}
                initialAutoExecuteMessage={message}
                initialChatId={chat}
                initialForceNewChat={parseBooleanFlag(newChat)}
                brandColor={agentProfile.meta.color}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isHistoryEnabled={historyIdentityAvailable}
                chatFailMessage={chatFailMessage ?? undefined}
                areFileAttachmentsEnabled={isFileAttachmentsEnabled}
                isFeedbackEnabled={isFeedbackEnabled}
            />
        </main>
    );
}
