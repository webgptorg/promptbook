'use server';
import type { Metadata, ResolvingMetadata } from 'next';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import type { AgentProjectItemInfo } from '@/src/components/AgentProjects/AgentProjectReferencesList';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveAgentAccess } from '@/src/utils/agentAccess';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { listAgentProjects } from '@/src/utils/agentProjects/listAgentProjects';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';
import { peekShareTargetPayload } from '@/src/utils/shareTargetPayloads';
import { getThinkingMessages, resolveThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { PrintHeader } from '../../../../components/PrintHeader/PrintHeader';
import { resolveAgentRouteTarget } from '../../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentName, getAgentProfile, isAgentDeleted, parseBooleanFlag } from '../_utils';
import { FORCE_NEW_CHAT_QUERY_VALUE } from '../agentChatNavigationUtils';
import { AgentChatHistoryClient } from './AgentChatHistoryClient';
import { generateChatMetadata } from './generateChatMetadata';

/**
 * Generates chat-page metadata that overrides the shared agent-name route title.
 *
 * @param _props - Route props required by Next.js metadata signature.
 * @param parent - Resolved inherited metadata from parent layouts.
 * @returns Metadata for the standalone agent chat route.
 */
export async function generateMetadata(
    _props: { params: Promise<{ agentName: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return generateChatMetadata(parent);
}

/**
 * Builds canonical standalone chat path while preserving supported query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical standalone chat path.
 */
function buildCanonicalAgentChatPath(
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
    const pathname = `/agents/${encodeURIComponent(canonicalAgentId)}/chat`;
    return query ? `${pathname}?${query}` : pathname;
}

/**
 * Resolves compact project references available to the agent chat surface.
 *
 * @param agentPermanentId - Permanent id of the agent owning the projects.
 * @returns Display-only project references safe to send to the client.
 */
async function resolveAgentChatProjectReferences(agentPermanentId: string): Promise<ReadonlyArray<AgentProjectItemInfo>> {
    const projectAccess = await resolveAgentProjectsAccess(agentPermanentId);
    if (!projectAccess.isProjectOverviewVisible) {
        return [];
    }

    const projects = await listAgentProjects(agentPermanentId);
    return projects.map(createAgentChatProjectReference);
}

/**
 * Converts full server project metadata into the browser-safe display shape.
 *
 * @param project - Full project metadata resolved on the server.
 * @returns Display-only project reference.
 */
function createAgentChatProjectReference(
    project: Awaited<ReturnType<typeof listAgentProjects>>[number],
): AgentProjectItemInfo {
    return {
        projectName: project.projectName,
        displayName: project.displayName,
        description: project.description,
        sizeBytes: project.sizeBytes,
    };
}

/**
 * Handles agent chat page.
 */
export default async function AgentChatPage({
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
    const isHeadless = headless !== undefined;

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
        redirect(buildCanonicalAgentChatPath(canonicalAgentId, currentSearchParams));
    }

    const access = await resolveAgentAccess(canonicalAgentId);
    if (!access.isAllowed) {
        return <ForbiddenPage />;
    }

    const isDeletedPromise = isAgentDeleted(canonicalAgentId);
    const agentProfilePromise = getAgentProfile(canonicalAgentId);
    const historyIdentityAvailablePromise = ensureChatHistoryIdentity();
    const currentUserPromise = getCurrentUser();
    const chatConfigurationPromise = loadChatConfiguration();
    const serverThinkingMessagesPromise = getThinkingMessages();
    const providedServerPromise = $provideServer();
    const agentProjectReferencesPromise = isHeadless
        ? Promise.resolve<ReadonlyArray<AgentProjectItemInfo>>([])
        : resolveAgentChatProjectReferences(canonicalAgentId);
    const shareTargetPayloadPromise = shareTarget
        ? peekShareTargetPayload({
              shareTargetId: shareTarget,
              agentPermanentId: canonicalAgentId,
          })
        : Promise.resolve(null);

    const isDeleted = await isDeletedPromise;

    if (isDeleted) {
        return (
            <main className="agents-server-viewport-width h-full flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const [
        agentProfile,
        historyIdentityAvailable,
        currentUser,
        { isFileAttachmentsEnabled, feedbackMode },
        serverThinkingMessages,
        { publicUrl },
        agentProjectReferences,
        shareTargetPayload,
        isCurrentUserSuperAdmin,
    ] =
        await Promise.all([
        agentProfilePromise,
        historyIdentityAvailablePromise,
        currentUserPromise,
        chatConfigurationPromise,
        serverThinkingMessagesPromise,
        providedServerPromise,
        agentProjectReferencesPromise,
        shareTargetPayloadPromise,
        isUserGlobalAdmin(),
    ]);
    const thinkingMessages = resolveThinkingMessages(agentProfile.thinkingMessages, serverThinkingMessages);
    const agentUrl = new URL(`/agents/${encodeURIComponent(canonicalAgentId)}`, publicUrl).href;
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
                isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
                projectReferences={agentProjectReferences}
                areFileAttachmentsEnabled={isFileAttachmentsEnabled}
                feedbackMode={feedbackMode}
                isHeadlessMode={isHeadless}
            />
        </main>
    );
}

// TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
