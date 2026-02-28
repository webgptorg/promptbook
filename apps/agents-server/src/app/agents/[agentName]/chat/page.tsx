'use server';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { PrintHeader } from '../../../../components/PrintHeader/PrintHeader';
import { resolveAgentRouteTarget } from '../../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentName, getAgentProfile, isAgentDeleted, parseBooleanFlag } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentChatHistoryClient } from './AgentChatHistoryClient';

export const generateMetadata = generateAgentMetadata;

/**
 * Builds canonical standalone chat path while preserving supported query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical standalone chat path.
 */
function buildCanonicalAgentChatPath(
    canonicalAgentId: string,
    search: { headless?: string; chat?: string; message?: string; newChat?: string },
): string {
    const params = new URLSearchParams();
    if (search.headless !== undefined) {
        params.set('headless', search.headless);
    }
    if (search.chat !== undefined) {
        params.set('chat', search.chat);
    }
    if (search.message !== undefined) {
        params.set('message', search.message);
    }
    if (search.newChat !== undefined) {
        params.set('newChat', search.newChat);
    }

    const query = params.toString();
    const pathname = `/agents/${encodeURIComponent(canonicalAgentId)}/chat`;
    return query ? `${pathname}?${query}` : pathname;
}

export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string; message?: string; chat?: string; newChat?: string }>;
}) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);
    const agentName = await getAgentName(params);
    const currentSearchParams = await searchParams;
    const { headless, message, chat, newChat } = currentSearchParams;

    const routeTarget = await resolveAgentRouteTarget(agentName);
    if (routeTarget === null) {
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
        redirect(buildCanonicalAgentChatPath(canonicalAgentId, currentSearchParams));
    }

    const isDeleted = await isAgentDeleted(canonicalAgentId);
    const agentProfile = await getAgentProfile(canonicalAgentId);
    const isHeadless = headless !== undefined;

    if (isDeleted) {
        return (
            <main className="agents-server-viewport-width h-full flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const agentUrl = `/agents/${encodeURIComponent(canonicalAgentId)}`;
    const thinkingMessages = await getThinkingMessages();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const historyIdentityAvailable = await ensureChatHistoryIdentity();
    const { chatFailMessage, isFileAttachmentsEnabled, isFeedbackEnabled } = await loadChatConfiguration();
    const agentDisplayName = agentProfile.meta.fullname || agentProfile.agentName || canonicalAgentId;

    return (
        <main className={`w-full h-full overflow-hidden relative agent-chat-route-surface print-export-chat-surface`}>
            <PrintHeader title={`Chat with ${agentDisplayName}`} />
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
                isHeadlessMode={isHeadless}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
