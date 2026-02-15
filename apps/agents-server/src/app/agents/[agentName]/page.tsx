'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { saturate } from '@promptbook-local/color';
import { NotFoundError, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveAgentAvatarImageUrl } from '../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../../src/utils/color/Color';
import { resolveSpeechRecognitionLanguage } from '../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { formatAgentNamingText } from '../../../utils/agentNaming';
import { resolveAgentRouteTarget } from '../../../utils/agentRouting/resolveAgentRouteTarget';
import { getAgentNaming } from '../../../utils/getAgentNaming';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { getAgentFolderContext, getAgentName, getAgentProfile, isAgentDeleted } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

/**
 * Builds a local canonical path for an agent while preserving supported query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical local path.
 */
function buildCanonicalAgentPath(
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
    const pathname = `/agents/${encodeURIComponent(canonicalAgentId)}`;
    return query ? `${pathname}?${query}` : pathname;
}

/**
 * Builds canonical standalone chat path.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical standalone chat path.
 */
function buildCanonicalAgentChatPath(
    canonicalAgentId: string,
    search: { chat?: string; message?: string; newChat?: string },
): string {
    const params = new URLSearchParams();
    if (search.chat !== undefined) {
        params.set('chat', search.chat);
    }
    if (search.message !== undefined) {
        params.set('message', search.message);
    }
    if (search.newChat !== undefined) {
        params.set('newChat', search.newChat);
    } else if (search.message !== undefined) {
        // Any `?message=...` handled on profile page should start as a fresh chat.
        params.set('newChat', '1');
    }

    const query = params.toString();
    const pathname = `/agents/${encodeURIComponent(canonicalAgentId)}/chat`;
    return query ? `${pathname}?${query}` : pathname;
}

/**
 * Renders the main agent profile page.
 *
 * @param params - Route params containing the agent name.
 * @param searchParams - Query parameters for the page.
 * @returns Agent profile UI.
 */
export default async function AgentPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string; chat?: string; message?: string; newChat?: string }>;
}) {
    const agentName = await getAgentName(params);
    const currentSearchParams = await searchParams;
    const routeTarget = await resolveAgentRouteTarget(agentName);
    if (routeTarget === null) {
        notFound();
    }
    if (routeTarget.kind === 'remote') {
        redirect(routeTarget.url);
    }

    const canonicalAgentId = routeTarget.canonicalAgentId;
    if (agentName !== canonicalAgentId) {
        redirect(buildCanonicalAgentPath(canonicalAgentId, currentSearchParams));
    }
    if (
        currentSearchParams.chat !== undefined ||
        currentSearchParams.message !== undefined ||
        currentSearchParams.newChat !== undefined
    ) {
        redirect(buildCanonicalAgentChatPath(canonicalAgentId, currentSearchParams));
    }

    const requestHeaders = await headers();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const isAdmin = await isUserAdmin();
    const currentUser = await getCurrentUser();
    const { headless: headlessParam } = currentSearchParams;
    const isHeadless = headlessParam !== undefined;
    const { publicUrl } = await $provideServer();
    const folderContext = await getAgentFolderContext(canonicalAgentId, isAdmin);
    const agentNaming = await getAgentNaming();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(canonicalAgentId);
    } catch (error) {
        if (
            error instanceof NotFoundError ||
            (error instanceof Error &&
                // Note: This is a bit hacky, but valid way to check for specific error message
                (error.message.includes('Cannot coerce the result to a single JSON object') ||
                    error.message.includes('JSON object requested, multiple (or no) results returned')))
        ) {
            notFound();
        }
        throw error;
    }

    // Build agent page URL for QR and copy
    const agentUrl = routeTarget.canonicalUrl;
    // <- TODO: [🐱‍🚀] Better

    const agentEmail = `${canonicalAgentId}@${publicUrl.hostname}`;

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();

    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;
    const isDeleted = await isAgentDeleted(canonicalAgentId);

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(canonicalAgentId)}/`} />
            <AgentProfileWrapper
                agent={agentProfile}
                agentUrl={agentUrl}
                publicUrl={publicUrl.href}
                agentEmail={agentEmail}
                agentName={canonicalAgentId}
                isAdmin={isAdmin}
                isHeadless={isHeadless}
                folderContext={folderContext}
                actions={
                    <>
                        {getAgentLinks(agentProfile.permanentId || canonicalAgentId, (text) =>
                            formatAgentNamingText(text, agentNaming),
                        )
                            .filter((link) => link.id === 'book' || link.id === 'integration')
                            .map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                                    title={link.title}
                                >
                                    <div className="p-2 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors shadow-sm">
                                        <link.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-sm">{link.title}</span>
                                </a>
                            ))}
                    </>
                }
            >
                {isDeleted && <DeletedAgentBanner />}
                <AgentProfileChat
                    agentUrl={agentUrl}
                    agentName={canonicalAgentId}
                    fullname={fullname}
                    brandColorHex={brandColorHex}
                    avatarSrc={
                        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
                        `/agents/${encodeURIComponent(agentProfile.permanentId || canonicalAgentId)}/images/default-avatar.png`
                    }
                    isDeleted={isDeleted}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    isHistoryEnabled={Boolean(currentUser)}
                />
            </AgentProfileWrapper>
        </>
    );
}

/**
 * TODO: [🐱‍🚀] Make this page look nice - 🃏
 * TODO: [🐱‍🚀] Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
