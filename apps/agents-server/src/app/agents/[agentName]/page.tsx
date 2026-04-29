'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveAgentAccess } from '@/src/utils/agentAccess';
import { isPublicAgentVisibility } from '@/src/utils/agentVisibility';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { isPublicServerVisibility } from '@/src/utils/serverVisibility';
import { saturate } from '@promptbook-local/color';
import { NotFoundError, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveAgentAvatarImageUrl } from '../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../../src/utils/color/Color';
import { resolveSpeechRecognitionLanguage } from '../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { TODO_USE } from '../../../../../../src/utils/organization/TODO_USE';
import { HeadlessLink } from '../../../components/_utils/headlessParam';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { resolveAgentChatInputPlaceholder } from '../../../utils/agentChatInputPlaceholder';
import { formatAgentNamingText } from '../../../utils/agentNaming';
import { resolveAgentRouteTarget, type AgentRouteTarget } from '../../../utils/agentRouting/resolveAgentRouteTarget';
import { loadChatConfiguration } from '../../../utils/chatConfiguration';
import { getAgentNaming } from '../../../utils/getAgentNaming';
import { getPseudoAgentDescriptor } from '../../../utils/pseudoAgents';
import { getAgentFolderContext, getAgentName, getAgentProfile, isAgentDeleted } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { DeferredAgentProfileChat } from './DeferredAgentProfileChat';
import { PseudoAgentProfilePage } from './PseudoAgentProfile';

/**
 * Query parameters supported by the agent profile route.
 */
type AgentPageSearchParams = {
    headless?: string;
    chat?: string;
    message?: string;
    newChat?: string;
    shareTarget?: string;
};

/**
 * Props accepted by the agent profile route component.
 */
type AgentPageProps = {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<AgentPageSearchParams>;
};

/**
 * Resolved route state for the agent profile page.
 */
type ResolvedAgentPageRoute =
    | {
          kind: 'local';
          canonicalAgentId: string;
          canonicalUrl: string;
          isHeadless: boolean;
      }
    | {
          kind: 'pseudo';
          canonicalAgentId: string;
          canonicalUrl: string;
          pseudoAgentKind: Extract<AgentRouteTarget, { kind: 'pseudo' }>['pseudoAgentKind'];
      };

/**
 * Data loaded for rendering a local agent profile page.
 */
type AgentPageData = {
    requestHeaders: Awaited<ReturnType<typeof headers>>;
    isAdmin: boolean;
    isAuthenticated: boolean;
    historyIdentityAvailable: boolean;
    publicUrl: Awaited<ReturnType<typeof $provideServer>>['publicUrl'];
    isFileAttachmentsEnabled: boolean;
    folderContext: Awaited<ReturnType<typeof getAgentFolderContext>>;
    agentNaming: Awaited<ReturnType<typeof getAgentNaming>>;
    serverVisibility: Awaited<ReturnType<typeof getServerVisibility>>;
    agentProfile: Awaited<ReturnType<typeof getAgentProfile>>;
    isDeleted: boolean;
};

/**
 * Render-ready values for the local agent profile page.
 */
type AgentPageViewModel = {
    publicAgentProfileStructuredData: AgentProfileStructuredData | null;
    agent: AgentPageData['agentProfile'];
    agentUrl: string;
    publicUrl: string;
    agentEmail: string;
    agentName: string;
    isAdmin: boolean;
    isAuthenticated: boolean;
    isHeadless: boolean;
    folderContext: AgentPageData['folderContext'];
    actions: React.ReactNode;
    isDeleted: boolean;
    fullname: string;
    inputPlaceholder: ReturnType<typeof resolveAgentChatInputPlaceholder>;
    brandColorHex: string;
    avatarSrc: string;
    initialAgentMessage: AgentPageData['agentProfile']['initialMessage'];
    speechRecognitionLanguage: ReturnType<typeof resolveSpeechRecognitionLanguage>;
    isHistoryEnabled: boolean;
    areFileAttachmentsEnabled: boolean;
};

/**
 * Builds a local canonical path for an agent while preserving supported query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param search - Current page query parameters.
 * @returns Canonical local path.
 */
function buildCanonicalAgentPath(canonicalAgentId: string, search: AgentPageSearchParams): string {
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
    search: Pick<AgentPageSearchParams, 'chat' | 'message' | 'newChat' | 'shareTarget'>,
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
    if (search.shareTarget !== undefined) {
        params.set('shareTarget', search.shareTarget);
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
 * Ensures the route target is local or pseudo, handling not-found and remote redirects.
 *
 * @param routeTarget - Raw route resolution target.
 * @returns Route target that can be rendered locally on this server.
 */
function requireLocalOrPseudoAgentRouteTarget(
    routeTarget: AgentRouteTarget | null,
): Exclude<AgentRouteTarget, { kind: 'remote' }> {
    if (routeTarget === null) {
        notFound();
    }

    if (routeTarget.kind === 'remote') {
        redirect(routeTarget.url);
    }

    return routeTarget;
}

/**
 * Resolves the incoming request into a local profile page or pseudo-agent page.
 *
 * @param props - Route params and query parameters.
 * @returns Resolved route state for rendering.
 */
async function resolveAgentPageRoute({ params, searchParams }: AgentPageProps): Promise<ResolvedAgentPageRoute> {
    const [agentName, currentSearchParams] = await Promise.all([getAgentName(params), searchParams]);
    const routeTarget = requireLocalOrPseudoAgentRouteTarget(await resolveAgentRouteTarget(agentName));

    if (routeTarget.kind === 'pseudo') {
        return resolvePseudoAgentPageRoute(agentName, currentSearchParams, routeTarget);
    }

    return resolveLocalAgentPageRoute(agentName, currentSearchParams, routeTarget);
}

/**
 * Resolves route state for pseudo-agent profile pages.
 *
 * @param agentName - Decoded route parameter from the request.
 * @param currentSearchParams - Current page query parameters.
 * @param routeTarget - Canonical pseudo-agent route target.
 * @returns Resolved pseudo-agent route state.
 */
function resolvePseudoAgentPageRoute(
    agentName: string,
    currentSearchParams: AgentPageSearchParams,
    routeTarget: Extract<AgentRouteTarget, { kind: 'pseudo' }>,
): Extract<ResolvedAgentPageRoute, { kind: 'pseudo' }> {
    const canonicalAgentId = routeTarget.canonicalAgentId;
    if (agentName !== canonicalAgentId) {
        redirect(buildCanonicalAgentPath(canonicalAgentId, currentSearchParams));
    }

    return {
        kind: 'pseudo',
        canonicalAgentId,
        canonicalUrl: routeTarget.canonicalUrl,
        pseudoAgentKind: routeTarget.pseudoAgentKind,
    };
}

/**
 * Resolves route state for local agent profile pages.
 *
 * @param agentName - Decoded route parameter from the request.
 * @param currentSearchParams - Current page query parameters.
 * @param routeTarget - Canonical local-agent route target.
 * @returns Resolved local profile route state.
 */
function resolveLocalAgentPageRoute(
    agentName: string,
    currentSearchParams: AgentPageSearchParams,
    routeTarget: Extract<AgentRouteTarget, { kind: 'local' }>,
): Extract<ResolvedAgentPageRoute, { kind: 'local' }> {
    const canonicalAgentId = routeTarget.canonicalAgentId;
    if (agentName !== canonicalAgentId) {
        redirect(buildCanonicalAgentPath(canonicalAgentId, currentSearchParams));
    }

    redirectProfileRequestsToChatPage(canonicalAgentId, currentSearchParams);

    return {
        kind: 'local',
        canonicalAgentId,
        canonicalUrl: routeTarget.canonicalUrl,
        isHeadless: currentSearchParams.headless !== undefined,
    };
}

/**
 * Redirects profile requests that already target chat-specific query parameters.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @param currentSearchParams - Current page query parameters.
 */
function redirectProfileRequestsToChatPage(canonicalAgentId: string, currentSearchParams: AgentPageSearchParams): void {
    if (
        currentSearchParams.chat === undefined &&
        currentSearchParams.message === undefined &&
        currentSearchParams.newChat === undefined
    ) {
        return;
    }

    redirect(buildCanonicalAgentChatPath(canonicalAgentId, currentSearchParams));
}

/**
 * Loads all server-side dependencies required to render a local agent profile page.
 *
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @returns Loaded profile page dependencies.
 */
async function loadAgentPageData(canonicalAgentId: string, isAuthenticated: boolean): Promise<AgentPageData> {
    TODO_USE(/* or remove */ isAuthenticated);

    const requestHeadersPromise = headers();
    const isAdminPromise = isUserAdmin();
    const historyIdentityAvailablePromise = ensureChatHistoryIdentity();
    const providedServerPromise = $provideServer();
    const serverVisibilityPromise = getServerVisibility();
    const chatConfigurationPromise = loadChatConfiguration();
    const agentNamingPromise = getAgentNaming();
    const folderContextPromise = getAgentFolderContext(canonicalAgentId);
    const agentProfilePromise = getAgentProfileOrNotFound(canonicalAgentId);
    const isDeletedPromise = isAgentDeleted(canonicalAgentId);

    const [
        requestHeaders,
        isAdmin,
        historyIdentityAvailable,
        { publicUrl },
        { isFileAttachmentsEnabled },
        folderContext,
        agentNaming,
        serverVisibility,
        agentProfile,
        isDeleted,
    ] = await Promise.all([
        requestHeadersPromise,
        isAdminPromise,
        historyIdentityAvailablePromise,
        providedServerPromise,
        chatConfigurationPromise,
        folderContextPromise,
        agentNamingPromise,
        serverVisibilityPromise,
        agentProfilePromise,
        isDeletedPromise,
    ]);

    return {
        requestHeaders,
        isAdmin,
        historyIdentityAvailable,
        publicUrl,
        isFileAttachmentsEnabled,
        folderContext,
        agentNaming,
        serverVisibility,
        agentProfile,
        isDeleted,
    };
}

/**
 * Resolves the full agent profile or turns known missing-agent failures into a 404.
 *
 * @param agentName - Canonical agent identifier.
 * @returns Resolved agent profile.
 */
async function getAgentProfileOrNotFound(agentName: string): Promise<AgentPageData['agentProfile']> {
    try {
        return await getAgentProfile(agentName);
    } catch (error) {
        if (isMissingAgentProfileError(error)) {
            notFound();
        }

        throw error;
    }
}

/**
 * Detects the known error shapes that mean the target agent cannot be resolved.
 *
 * @param error - Unknown thrown value from profile loading.
 * @returns `true` when the error should be treated as a 404.
 */
function isMissingAgentProfileError(error: unknown): boolean {
    return (
        error instanceof NotFoundError ||
        (error instanceof Error &&
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned')))
    );
}

/**
 * Converts loaded page data into render-ready props for the local profile page.
 *
 * @param route - Resolved local route state.
 * @param data - Loaded profile page dependencies.
 * @returns Render-ready view model.
 */
function createAgentPageViewModel(
    route: Extract<ResolvedAgentPageRoute, { kind: 'local' }>,
    data: AgentPageData,
): AgentPageViewModel {
    const { agentProfile, agentNaming, isDeleted, publicUrl, requestHeaders, serverVisibility } = data;

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();
    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;
    const inputPlaceholder = resolveAgentChatInputPlaceholder(agentProfile.meta.inputPlaceholder);
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const fallbackAvatarPath = `/agents/${encodeURIComponent(
        agentProfile.permanentId || route.canonicalAgentId,
    )}/images/default-avatar.png`;
    const avatarSrc =
        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) || fallbackAvatarPath;

    return {
        publicAgentProfileStructuredData: createPublicAgentProfileStructuredData({
            isPublic:
                isPublicServerVisibility(serverVisibility) &&
                isPublicAgentVisibility(agentProfile.visibility) &&
                !isDeleted,
            canonicalUrl: route.canonicalUrl,
            title: fullname,
            description: agentProfile.meta.description || agentProfile.personaDescription || undefined,
            imageUrl: toAbsoluteUrl(avatarSrc, publicUrl.href),
        }),
        agent: agentProfile,
        agentUrl: route.canonicalUrl,
        publicUrl: publicUrl.href,
        agentEmail: `${route.canonicalAgentId}@${publicUrl.hostname}`,
        agentName: route.canonicalAgentId,
        isAdmin: data.isAdmin,
        isAuthenticated: data.isAuthenticated,
        isHeadless: route.isHeadless,
        folderContext: data.folderContext,
        actions: createAgentPageActions(agentProfile, agentNaming, route.canonicalAgentId, data.isAuthenticated),
        isDeleted,
        fullname,
        inputPlaceholder,
        brandColorHex,
        avatarSrc,
        initialAgentMessage: agentProfile.initialMessage,
        speechRecognitionLanguage,
        isHistoryEnabled: data.historyIdentityAvailable,
        areFileAttachmentsEnabled: data.isFileAttachmentsEnabled,
    };
}

/**
 * Builds the action links displayed in the profile header.
 *
 * @param agentProfile - Loaded agent profile.
 * @param agentNaming - Naming formatter configuration.
 * @param canonicalAgentId - Canonical permanent identifier of the local agent.
 * @returns Profile action links.
 */
function createAgentPageActions(
    agentProfile: AgentPageData['agentProfile'],
    agentNaming: AgentPageData['agentNaming'],
    canonicalAgentId: string,
    isAuthenticated: boolean,
): React.ReactNode {
    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            {getAgentLinks(agentProfile.permanentId || canonicalAgentId, (text) =>
                formatAgentNamingText(text, agentNaming),
            )
                .filter((link) => link.id === 'book' || link.id === 'integration')
                .map((link) => (
                    <HeadlessLink
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                        title={link.title}
                    >
                        <div className="p-2 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors shadow-sm">
                            <link.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm">{link.title}</span>
                    </HeadlessLink>
                ))}
        </>
    );
}

/**
 * Renders the pseudo-agent profile page for a resolved pseudo route.
 *
 * @param route - Resolved pseudo-agent route state.
 * @returns Pseudo-agent profile UI.
 */
function renderPseudoAgentProfilePage(route: Extract<ResolvedAgentPageRoute, { kind: 'pseudo' }>) {
    const descriptor = getPseudoAgentDescriptor(route.pseudoAgentKind);

    return (
        <PseudoAgentProfilePage
            descriptor={descriptor}
            canonicalAgentId={route.canonicalAgentId}
            canonicalUrl={route.canonicalUrl}
        />
    );
}

/**
 * Renders the local agent profile page from a prepared view model.
 *
 * @param viewModel - Render-ready local page props.
 * @returns Local agent profile UI.
 */
function renderAgentProfilePage(viewModel: AgentPageViewModel) {
    return (
        <>
            {viewModel.publicAgentProfileStructuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(viewModel.publicAgentProfileStructuredData) }}
                />
            )}
            <AgentProfileWrapper
                agent={viewModel.agent}
                agentUrl={viewModel.agentUrl}
                publicUrl={viewModel.publicUrl}
                agentEmail={viewModel.agentEmail}
                agentName={viewModel.agentName}
                isAdmin={viewModel.isAdmin}
                isAuthenticated={viewModel.isAuthenticated}
                isHeadless={viewModel.isHeadless}
                folderContext={viewModel.folderContext}
                actions={viewModel.actions}
            >
                {viewModel.isDeleted && <DeletedAgentBanner />}
                <DeferredAgentProfileChat
                    agentUrl={viewModel.agentUrl}
                    agentName={viewModel.agentName}
                    fullname={viewModel.fullname}
                    inputPlaceholder={viewModel.inputPlaceholder}
                    brandColorHex={viewModel.brandColorHex}
                    avatarSrc={viewModel.avatarSrc}
                    initialAgentMessage={viewModel.initialAgentMessage}
                    isDeleted={viewModel.isDeleted}
                    speechRecognitionLanguage={viewModel.speechRecognitionLanguage}
                    isHistoryEnabled={viewModel.isHistoryEnabled}
                    areFileAttachmentsEnabled={viewModel.areFileAttachmentsEnabled}
                />
            </AgentProfileWrapper>
        </>
    );
}

/**
 * Renders the main agent profile page.
 *
 * @param params - Route params containing the agent name.
 * @param searchParams - Query parameters for the page.
 * @returns Agent profile UI.
 */
export default async function AgentPage(props: AgentPageProps) {
    const route = await resolveAgentPageRoute(props);
    if (route.kind === 'pseudo') {
        return renderPseudoAgentProfilePage(route);
    }

    const access = await resolveAgentAccess(route.canonicalAgentId);
    if (!access.isAllowed) {
        return <ForbiddenPage />;
    }

    const pageData = await loadAgentPageData(route.canonicalAgentId, Boolean(access.currentUser));
    return renderAgentProfilePage(createAgentPageViewModel(route, pageData));
}

// TODO: [🐱‍🚀] Make this page look nice - 🃏
// TODO: [🐱‍🚀] Show usage of LLM
// TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
// TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
