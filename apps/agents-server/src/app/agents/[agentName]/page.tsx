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
import { loadChatConfiguration } from '../../../utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { isPublicAgentVisibility } from '@/src/utils/agentVisibility';
import { getAgentFolderContext, getAgentName, getAgentProfile, isAgentDeleted } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';
import { getPseudoAgentDescriptor } from '../../../utils/pseudoAgents';
import { PseudoAgentProfilePage } from './PseudoAgentProfile';

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
 * Structured data payload for public agent profile pages.
 */
type AgentProfileStructuredData = {
    '@context': 'https://schema.org';
    '@type': 'ProfilePage';
    url: string;
    name: string;
    description?: string;
    image?: string;
    mainEntity: {
        '@type': 'SoftwareApplication';
        name: string;
        description?: string;
        url: string;
        image?: string;
        applicationCategory: string;
    };
};

/**
 * Normalizes one URL into an absolute string for structured-data usage.
 *
 * @param value - Relative or absolute URL candidate.
 * @param baseUrl - Absolute server base URL.
 * @returns Absolute URL string or `undefined` for invalid inputs.
 */
function toAbsoluteUrl(value: string, baseUrl: string): string | undefined {
    try {
        return new URL(value, baseUrl).href;
    } catch {
        return undefined;
    }
}

/**
 * Builds structured data for a publicly indexable agent profile page.
 *
 * @param options - Structured data input values.
 * @returns JSON-LD payload or `null` when indexing should be disabled.
 */
function createPublicAgentProfileStructuredData(options: {
    isPublic: boolean;
    canonicalUrl: string;
    title: string;
    description?: string;
    imageUrl?: string;
}): AgentProfileStructuredData | null {
    if (!options.isPublic) {
        return null;
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: options.canonicalUrl,
        name: options.title,
        description: options.description,
        image: options.imageUrl,
        mainEntity: {
            '@type': 'SoftwareApplication',
            name: options.title,
            description: options.description,
            url: options.canonicalUrl,
            image: options.imageUrl,
            applicationCategory: 'BusinessApplication',
        },
    };
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

    if (routeTarget.kind === 'pseudo') {
        const canonicalAgentId = routeTarget.canonicalAgentId;
        if (agentName !== canonicalAgentId) {
            redirect(buildCanonicalAgentPath(canonicalAgentId, currentSearchParams));
        }

        const descriptor = getPseudoAgentDescriptor(routeTarget.pseudoAgentKind);
        return (
            <PseudoAgentProfilePage
                descriptor={descriptor}
                canonicalAgentId={canonicalAgentId}
                canonicalUrl={routeTarget.canonicalUrl}
            />
        );
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
    const historyIdentityAvailable = await ensureChatHistoryIdentity();
    const { headless: headlessParam } = currentSearchParams;
    const isHeadless = headlessParam !== undefined;
    const { publicUrl } = await $provideServer();
    const { isFileAttachmentsEnabled } = await loadChatConfiguration();
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
    const fallbackAvatarPath = `/agents/${encodeURIComponent(agentProfile.permanentId || canonicalAgentId)}/images/default-avatar.png`;
    const avatarSrc = resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) || fallbackAvatarPath;
    const publicAgentProfileStructuredData = createPublicAgentProfileStructuredData({
        isPublic: isPublicAgentVisibility(agentProfile.visibility) && !isDeleted,
        canonicalUrl: routeTarget.canonicalUrl,
        title: fullname,
        description: agentProfile.meta.description || agentProfile.personaDescription || undefined,
        imageUrl: toAbsoluteUrl(avatarSrc, publicUrl.href),
    });

    return (
        <>
            {publicAgentProfileStructuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(publicAgentProfileStructuredData) }}
                />
            )}
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
                    avatarSrc={avatarSrc}
                    isDeleted={isDeleted}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    isHistoryEnabled={historyIdentityAvailable}
                    areFileAttachmentsEnabled={isFileAttachmentsEnabled}
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
