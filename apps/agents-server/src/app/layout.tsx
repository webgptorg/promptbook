import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import { createThemeModeBootstrapScript } from '@/src/components/ThemeMode/createThemeModeBootstrapScript';
import { APPLICATION_FONT_VARIABLE_CLASS_NAME } from '@/src/utils/applicationFonts';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCustomJavascriptWithIntegrations } from '../database/customJavascript';
import { getAggregatedCustomStylesheetCss } from '../database/customStylesheet';
import { getMetadataMap } from '../database/getMetadata';
import { getServerVisibility } from '../utils/getServerVisibility';
import {
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
    parseServerLanguageEnforcedMetadata,
    resolveServerLanguageCode,
    SERVER_LANGUAGE_COOKIE_NAME,
    SERVER_LANGUAGE_METADATA_KEY,
} from '../languages/ServerLanguageRegistry';
import { $provideServer } from '../tools/$provideServer';
import { loadAgentOrganizationState } from '../utils/agentOrganization/loadAgentOrganizationState';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../utils/agentOrganization/types';
import { getAgentNaming } from '../utils/getAgentNaming';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getDefaultChatPreferences } from '../utils/chatPreferences';
import {
    CHAT_VISUAL_MODE_COOKIE_NAME,
    CHAT_VISUAL_MODE_METADATA_KEY,
    resolveChatVisualMode,
} from '../constants/chatVisualMode';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    resolveDefaultAgentAvatarVisualId,
} from '../constants/defaultAgentAvatarVisual';
import { THEME_MODE_COOKIE_NAME, resolveThemeMode } from '../constants/themeMode';
import { parseChatFeedbackMode } from '../utils/chatFeedbackMode';
import { getFederatedServers } from '../utils/getFederatedServers';
import { isUserAdmin } from '../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../utils/isUserGlobalAdmin';
import { getUserThemeModeSettingsForUser } from '../utils/userThemeModeSettings';
import { getDefaultIsNotificationsOn } from '../utils/userPushNotificationSettings';
import { isPublicServerVisibility } from '../utils/serverVisibility';
import {
    CONTROL_PANEL_OPTION_AVAILABILITY_METADATA_KEYS,
    getControlPanelOptionAvailability,
} from '../utils/getControlPanelOptionAvailability';
import './globals.css';

/**
 * Footer link shape consumed by the root layout.
 */
type LayoutFooterLink = {
    title: string;
    url: string;
};

/**
 * Federated server descriptor consumed by the header and footer.
 */
type LayoutFederatedServer = LayoutFooterLink & {
    logoUrl: string | null;
};

/**
 * Timeout used when probing federated server metadata for header logos.
 */
const FEDERATED_SERVER_METADATA_TIMEOUT_MS = 1_500;

/**
 * Revalidation window for federated server logo metadata fetches.
 */
const FEDERATED_SERVER_METADATA_REVALIDATE_SECONDS = 300;

/**
 * Parses footer links stored in metadata, falling back to an empty list on invalid JSON.
 *
 * @param rawFooterLinks - Raw FOOTER_LINKS metadata value.
 * @returns Footer link definitions safe to pass to the client shell.
 */
function parseFooterLinks(rawFooterLinks: string | null): LayoutFooterLink[] {
    try {
        const parsedFooterLinks = JSON.parse(rawFooterLinks || '[]');
        if (!Array.isArray(parsedFooterLinks)) {
            return [];
        }

        return parsedFooterLinks.filter(
            (link): link is LayoutFooterLink =>
                typeof link === 'object' &&
                link !== null &&
                typeof (link as { title?: unknown }).title === 'string' &&
                typeof (link as { url?: unknown }).url === 'string',
        );
    } catch (error) {
        console.error('Failed to parse FOOTER_LINKS', error);
        return [];
    }
}

/**
 * Loads one federated server logo without letting a slow remote server block the whole page.
 *
 * @param serverUrl - Base URL of the federated server.
 * @returns Server logo URL or `null` when unavailable.
 */
async function fetchFederatedServerLogoUrl(serverUrl: string): Promise<string | null> {
    try {
        const response = await fetch(`${serverUrl}/api/metadata`, {
            next: { revalidate: FEDERATED_SERVER_METADATA_REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(FEDERATED_SERVER_METADATA_TIMEOUT_MS),
        });

        if (!response.ok) {
            return null;
        }

        const metadata = (await response.json()) as Record<string, unknown>;
        return typeof metadata.SERVER_LOGO_URL === 'string' && metadata.SERVER_LOGO_URL !== ''
            ? metadata.SERVER_LOGO_URL
            : null;
    } catch {
        return null;
    }
}

/**
 * Resolves federated server entries only when they are visible for the current request.
 *
 * @param options - Visibility and identity options for federated server loading.
 * @returns Federated server descriptors for header/footer navigation.
 */
async function getLayoutFederatedServers(options: {
    currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
    showFederatedServersPublicly: boolean;
}): Promise<LayoutFederatedServer[]> {
    const { currentUser, showFederatedServersPublicly } = options;
    if (!currentUser && !showFederatedServersPublicly) {
        return [];
    }

    try {
        const federatedServerUrls = await getFederatedServers({ excludeHiddenCoreServer: true });
        return Promise.all(
            federatedServerUrls.map(async (url) => ({
                title: `Federated: ${new URL(url).hostname}`,
                url,
                logoUrl: await fetchFederatedServerLogoUrl(url),
            })),
        );
    } catch (error) {
        console.error('Failed to fetch federated servers for layout', error);
        return [];
    }
}

/**
 * Resolves optional layout text assets while keeping the shell resilient to non-critical failures.
 *
 * @param label - Human-readable asset label for logging.
 * @param loader - Async loader returning the asset content.
 * @returns Loaded text or an empty string when loading fails.
 */
async function resolveOptionalLayoutText(label: string, loader: () => Promise<string>): Promise<string> {
    try {
        return await loader();
    } catch (error) {
        console.error(`Failed to load ${label}`, error);
        return '';
    }
}

/**
 * Generates metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
    const [{ publicUrl }, metadata, serverVisibility] = await Promise.all([
        $provideServer(),
        getMetadataMap(['SERVER_NAME', 'SERVER_DESCRIPTION', 'SERVER_FAVICON_URL']),
        getServerVisibility(),
    ]);
    const isPublicServer = isPublicServerVisibility(serverVisibility);
    const serverName = metadata.SERVER_NAME || 'Promptbook Agents Server';
    const serverDescription = metadata.SERVER_DESCRIPTION || 'Agents server powered by Promptbook';
    const serverFaviconUrl = metadata.SERVER_FAVICON_URL || faviconLogoImage.src;

    const baseMetadata = {
        title: serverName,
        description: serverDescription,
        // TODO: keywords: ['@@@'], <- Do the keywords dynamically, each agents server could have its own keywords + some common ones
        authors: [{ name: 'Promptbook Team' }],
        icons: {
            icon: serverFaviconUrl,
            shortcut: serverFaviconUrl,
            apple: serverFaviconUrl,
        },
        robots: {
            index: isPublicServer,
            follow: isPublicServer,
        },
        metadataBase: publicUrl,
    } satisfies Metadata;

    if (!isPublicServer) {
        return baseMetadata;
    }

    return {
        ...baseMetadata,
        openGraph: {
            title: serverName,
            description: serverDescription,
            type: 'website',
            images: [
                /*
            TODO:
            {
                url: 'https://www.ptbk.io/design',
                width: 1200,
                height: 630,
                alt: 'Promptbook agents server',
            },
            */
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: serverName,
            description: serverDescription,
            // TODO: images: ['https://www.ptbk.io/design'],
        },
    };
}

/**
 * Handles root layout.
 */
export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const layoutMetadataPromise = getMetadataMap([
        'SERVER_NAME',
        'SERVER_LOGO_URL',
        'IS_FOOTER_SHOWN',
        'FOOTER_LINKS',
        'SHOW_FEDERATED_SERVERS_PUBLICLY',
        'IS_EXPERIMENTAL_APP',
        'CHAT_FEEDBACK_MODE',
        'IS_FEEDBACK_ENABLED',
        'IS_EXPERIMENTAL_PWA_APP_ENABLED',
        CHAT_VISUAL_MODE_METADATA_KEY,
        DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
        SERVER_LANGUAGE_METADATA_KEY,
        IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
        ...CONTROL_PANEL_OPTION_AVAILABILITY_METADATA_KEYS,
    ]);
    const currentUserPromise = getCurrentUser();
    const isAdminPromise = isUserAdmin();
    const isGlobalAdminPromise = isUserGlobalAdmin();
    const serverVisibilityPromise = getServerVisibility();
    const agentNamingPromise = getAgentNaming();
    const organizationStatePromise = isAdminPromise.then((isAdmin) =>
        isAdmin ? loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true }) : null,
    );
    const chatPreferencesPromise = getDefaultChatPreferences();
    const defaultIsNotificationsOnPromise = getDefaultIsNotificationsOn();
    const customStylesheetCssPromise = resolveOptionalLayoutText(
        'custom stylesheet CSS',
        getAggregatedCustomStylesheetCss,
    );
    const customJavascriptPromise = resolveOptionalLayoutText(
        'custom JavaScript',
        getCustomJavascriptWithIntegrations,
    );
    const cookieStorePromise = cookies();
    const defaultThemeModePromise = Promise.all([currentUserPromise, cookieStorePromise]).then(
        async ([currentUser, cookieStore]) => {
            const cookieThemeMode = cookieStore.get(THEME_MODE_COOKIE_NAME)?.value || null;
            if (cookieThemeMode) {
                return resolveThemeMode(cookieThemeMode);
            }

            if (!currentUser?.id) {
                return resolveThemeMode(null);
            }

            const storedThemeSettings = await getUserThemeModeSettingsForUser(currentUser.id);
            return storedThemeSettings?.themeMode || resolveThemeMode(null);
        },
    );
    const federatedServersPromise = Promise.all([layoutMetadataPromise, currentUserPromise]).then(
        ([layoutMetadata, currentUser]) =>
            getLayoutFederatedServers({
                currentUser,
                showFederatedServersPublicly: (layoutMetadata.SHOW_FEDERATED_SERVERS_PUBLICLY ?? 'false') === 'true',
            }),
    );
    const footerLinksPromise = Promise.all([layoutMetadataPromise, federatedServersPromise, serverVisibilityPromise]).then(
        ([layoutMetadata, federatedServers, serverVisibility]) => {
            const footerLinks = [
                ...parseFooterLinks(layoutMetadata.FOOTER_LINKS),
                ...federatedServers.map(({ title, url }) => ({ title, url })),
            ];

            if (isPublicServerVisibility(serverVisibility)) {
                footerLinks.push({
                    title: 'Sitemap',
                    url: '/sitemap.xml',
                });
            }

            return footerLinks;
        },
    );

    const [
        isAdmin,
        isGlobalAdmin,
        currentUser,
        layoutMetadata,
        agentNaming,
        organizationState,
        chatPreferences,
        defaultIsNotificationsOn,
        customStylesheetCss,
        customJavascript,
        cookieStore,
        defaultThemeMode,
        federatedServers,
        footerLinks,
        serverVisibility,
    ] = await Promise.all([
        isAdminPromise,
        isGlobalAdminPromise,
        currentUserPromise,
        layoutMetadataPromise,
        agentNamingPromise,
        organizationStatePromise,
        chatPreferencesPromise,
        defaultIsNotificationsOnPromise,
        customStylesheetCssPromise,
        customJavascriptPromise,
        cookieStorePromise,
        defaultThemeModePromise,
        federatedServersPromise,
        footerLinksPromise,
        serverVisibilityPromise,
    ]);

    const serverName = layoutMetadata.SERVER_NAME || 'Promptbook Agents Server';
    const serverLogoUrl = layoutMetadata.SERVER_LOGO_URL || null;
    const isFooterShown = (layoutMetadata.IS_FOOTER_SHOWN ?? 'true') === 'true';
    const agents: AgentOrganizationAgent[] = organizationState?.agents || [];
    const agentFolders: AgentOrganizationFolder[] = organizationState?.folders || [];
    const isExperimental = (layoutMetadata.IS_EXPERIMENTAL_APP ?? 'false') === 'true';
    const feedbackMode = parseChatFeedbackMode(layoutMetadata.CHAT_FEEDBACK_MODE, layoutMetadata.IS_FEEDBACK_ENABLED);
    const isExperimentalPwaAppEnabled = (layoutMetadata.IS_EXPERIMENTAL_PWA_APP_ENABLED ?? 'true') === 'true';
    const isPublicServer = isPublicServerVisibility(serverVisibility);
    const safeCustomJavascript = customJavascript.replace(/<\/script>/gi, '<\\/script>');
    const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() || null;
    const chatVisualModeCookie = cookieStore.get(CHAT_VISUAL_MODE_COOKIE_NAME)?.value || null;
    const cookieLanguage = cookieStore.get(SERVER_LANGUAGE_COOKIE_NAME)?.value || null;
    const isServerLanguageEnforced = parseServerLanguageEnforcedMetadata(
        layoutMetadata[IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY],
    );
    const rawServerLanguage = layoutMetadata[SERVER_LANGUAGE_METADATA_KEY];
    const rawChatVisualMode = layoutMetadata[CHAT_VISUAL_MODE_METADATA_KEY];
    const rawDefaultAgentAvatarVisual = layoutMetadata[DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY];
    const defaultChatVisualMode = resolveChatVisualMode(chatVisualModeCookie || rawChatVisualMode);
    const defaultAgentAvatarVisualId = resolveDefaultAgentAvatarVisualId(rawDefaultAgentAvatarVisual);
    const preferredLanguageSource = isServerLanguageEnforced ? rawServerLanguage : cookieLanguage || rawServerLanguage;
    const serverLanguage = resolveServerLanguageCode(preferredLanguageSource);
    const controlPanelOptionAvailability = getControlPanelOptionAvailability({
        metadata: layoutMetadata,
        isPushNotificationsConfigured: Boolean(webPushPublicKey),
    });
    const themeModeBootstrapScript = createThemeModeBootstrapScript(defaultThemeMode);

    return (
        <html
            lang={serverLanguage}
            suppressHydrationWarning
            className={defaultThemeMode === 'DARK' ? 'dark' : undefined}
            data-theme-mode={defaultThemeMode.toLowerCase()}
            data-theme-resolved={defaultThemeMode === 'DARK' ? 'dark' : 'light'}
        >
            {/* Note: Icon is set via metadata to allow agent-page specific icons to override it */}
            <body className={`${APPLICATION_FONT_VARIABLE_CLASS_NAME} bg-background text-foreground antialiased`}>
                <script
                    id="agents-server-theme-mode"
                    dangerouslySetInnerHTML={{ __html: themeModeBootstrapScript }}
                />
                {customStylesheetCss && <style id="agents-server-custom-css">{customStylesheetCss}</style>}
                <LayoutWrapper
                    isAdmin={isAdmin}
                    isGlobalAdmin={isGlobalAdmin}
                    currentUser={currentUser}
                    serverName={serverName}
                    serverLogoUrl={serverLogoUrl}
                    agents={JSON.parse(JSON.stringify(agents))}
                    agentFolders={JSON.parse(JSON.stringify(agentFolders))}
                    agentNaming={agentNaming}
                    isFooterShown={isFooterShown}
                    footerLinks={isPublicServer ? footerLinks : footerLinks.filter((link) => link.url !== '/sitemap.xml')}
                    federatedServers={federatedServers}
                    defaultIsSoundsOn={chatPreferences.defaultIsSoundsOn}
                    defaultIsVibrationOn={chatPreferences.defaultIsVibrationOn}
                    defaultIsNotificationsOn={defaultIsNotificationsOn}
                    isExperimental={isExperimental}
                    feedbackMode={feedbackMode}
                    isExperimentalPwaAppEnabled={isExperimentalPwaAppEnabled}
                    controlPanelOptionAvailability={controlPanelOptionAvailability}
                    defaultServerLanguage={serverLanguage}
                    isServerLanguageEnforced={isServerLanguageEnforced}
                    defaultThemeMode={defaultThemeMode}
                    defaultChatVisualMode={defaultChatVisualMode}
                    defaultAgentAvatarVisualId={defaultAgentAvatarVisualId}
                    webPushPublicKey={webPushPublicKey}
                >
                    {children}
                </LayoutWrapper>
                {customJavascript && (
                    <script
                        id="agents-server-custom-js"
                        dangerouslySetInnerHTML={{ __html: safeCustomJavascript }}
                    />
                )}
                {/* Global portal root for modals/popups */}
                <div id="portal-root" />
            </body>
        </html>
    );
}
