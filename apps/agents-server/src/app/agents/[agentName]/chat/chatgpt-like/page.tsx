'use server';
import type { Metadata } from 'next';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { peekShareTargetPayload } from '@/src/utils/shareTargetPayloads';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../../components/DeletedAgentBanner';
import { PrintHeader } from '../../../../../components/PrintHeader/PrintHeader';
import { resolveAgentRouteTarget } from '../../../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentName, getAgentProfile, isAgentDeleted, parseBooleanFlag } from '../../_utils';
import { FORCE_NEW_CHAT_QUERY_VALUE } from '../../agentChatNavigationUtils';
import { AgentChatHistoryClient } from '../AgentChatHistoryClient';
import { generateChatMetadata } from '../generateChatMetadata';

/**
 * Generates chat-page metadata that overrides the shared agent-name route title.
 *
 * @returns Metadata for the ChatGPT-like agent chat route.
 */
export async function generateMetadata(): Promise<Metadata> {
    return generateChatMetadata();
}

/**
 * Builds canonical ChatGPT-like chat path while preserving supported query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical ChatGPT-like chat path.
 */
function buildCanonicalAgentChatGptLikePath(
    canonicalAgentId: string,
    search: { headless?: string; chat?: string; message?: string; newChat?: string; shareTarget?: string },
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
    if (search.shareTarget !== undefined) {
        params.set('shareTarget', search.shareTarget);
    }

    const query = params.toString();
    const pathname = `/agents/${encodeURIComponent(canonicalAgentId)}/chat/chatgpt-like`;
    return query ? `${pathname}?${query}` : pathname;
}

/**
 * Renders the ChatGPT-like standalone chat page for an agent while reusing the
 * canonical durable chat pipeline.
 */
export default async function AgentChatGptLikePage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string; message?: string; chat?: string; newChat?: string; shareTarget?: string }>;
}) {
    const requestHeadersPromise = headers();
    const [agentName, currentSearchParams, requestHeaders] = await Promise.all([getAgentName(params), searchParams, requestHeadersPromise]);
    $sideEffect(requestHeaders);
    const { headless, message, chat, newChat, shareTarget } = currentSearchParams;

    const isForcedNewChat = chat === FORCE_NEW_CHAT_QUERY_VALUE || parseBooleanFlag(newChat);
    const effectiveChatId = chat === FORCE_NEW_CHAT_QUERY_VALUE ? undefined : chat;

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
        redirect(buildCanonicalAgentChatGptLikePath(canonicalAgentId, currentSearchParams));
    }

    const isDeletedPromise = isAgentDeleted(canonicalAgentId);
    const agentProfilePromise = getAgentProfile(canonicalAgentId);
    const historyIdentityAvailablePromise = ensureChatHistoryIdentity();
    const currentUserPromise = getCurrentUser();
    const chatConfigurationPromise = loadChatConfiguration();
    const thinkingMessagesPromise = getThinkingMessages();
    const shareTargetPayloadPromise = shareTarget
        ? peekShareTargetPayload({
              shareTargetId: shareTarget,
              agentPermanentId: canonicalAgentId,
          })
        : Promise.resolve(null);

    const isDeleted = await isDeletedPromise;
    const isHeadless = headless !== undefined;

    if (isDeleted) {
        return (
            <main className="agents-server-viewport-width h-full flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const agentUrl = `/agents/${encodeURIComponent(canonicalAgentId)}`;
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const [
        agentProfile,
        historyIdentityAvailable,
        currentUser,
        { isFileAttachmentsEnabled, feedbackMode },
        thinkingMessages,
        shareTargetPayload,
    ] =
        await Promise.all([
        agentProfilePromise,
        historyIdentityAvailablePromise,
        currentUserPromise,
        chatConfigurationPromise,
        thinkingMessagesPromise,
        shareTargetPayloadPromise,
    ]);
    const agentDisplayName = agentProfile.meta.fullname || agentProfile.agentName || canonicalAgentId;
    const inputPlaceholder = agentProfile.meta.inputPlaceholder?.trim() || undefined;
    const initialAutoExecuteMessage = shareTargetPayload?.message || message;
    const initialAutoExecuteMessageAttachments = shareTargetPayload?.attachments;

    return (
        <main className={`agents-server-chat-route relative agent-chat-route-surface print-export-chat-surface`}>
            <PrintHeader title={`Chat with ${agentDisplayName}`} />
            <AgentChatHistoryClient
                agentName={canonicalAgentId}
                agentTitle={agentDisplayName}
                agentUrl={agentUrl}
                initialAutoExecuteMessage={initialAutoExecuteMessage}
                initialAutoExecuteMessageAttachments={initialAutoExecuteMessageAttachments}
                initialShareTargetId={shareTargetPayload?.id}
                initialChatId={effectiveChatId}
                initialForceNewChat={isForcedNewChat}
                initialAgentMessage={agentProfile.initialMessage}
                brandColor={agentProfile.meta.color}
                inputPlaceholder={inputPlaceholder}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isHistoryEnabled={historyIdentityAvailable}
                isCurrentUserAdmin={currentUser?.isAdmin === true}
                areFileAttachmentsEnabled={isFileAttachmentsEnabled}
                feedbackMode={feedbackMode}
                isHeadlessMode={isHeadless}
                chatRouteBasePath={`/agents/${encodeURIComponent(canonicalAgentId)}/chat/chatgpt-like`}
                layoutVariant="chatgptLike"
            />
        </main>
    );
}
