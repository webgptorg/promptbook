import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import type { Metadata } from 'next';
import { Barlow_Condensed, Poppins } from 'next/font/google';
import { cookies } from 'next/headers';
import { getCustomJavascriptWithIntegrations } from '../database/customJavascript';
import { getAggregatedCustomStylesheetCss } from '../database/customStylesheet';
import { getMetadataMap } from '../database/getMetadata';
import {
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
import { getFederatedServers } from '../utils/getFederatedServers';
import { isUserAdmin } from '../utils/isUserAdmin';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    display: 'swap',
    fallback: ['Arial', 'Helvetica', 'sans-serif'],
    variable: '--font-barlow-condensed',
});

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
    fallback: ['Arial', 'Helvetica', 'sans-serif'],
    variable: '--font-poppins',
});

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

export async function generateMetadata(): Promise<Metadata> {
    const [{ publicUrl }, metadata] = await Promise.all([
        $provideServer(),
        getMetadataMap(['SERVER_NAME', 'SERVER_DESCRIPTION', 'SERVER_FAVICON_URL']),
    ]);
    const serverName = metadata.SERVER_NAME || 'Promptbook Agents Server';
    const serverDescription = metadata.SERVER_DESCRIPTION || 'Agents server powered by Promptbook';
    const serverFaviconUrl = metadata.SERVER_FAVICON_URL || faviconLogoImage.src;

    return {
        title: serverName,
        description: serverDescription,
        // TODO: keywords: ['@@@'], <- Do the keywords dynamically, each agents server could have its own keywords + some common ones
        authors: [{ name: 'Promptbook Team' }],
        icons: {
            icon: serverFaviconUrl,
            shortcut: serverFaviconUrl,
            apple: serverFaviconUrl,
        },
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
        metadataBase: publicUrl,
    };
}

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
        'IS_FEEDBACK_ENABLED',
        'IS_EXPERIMENTAL_PWA_APP_ENABLED',
        SERVER_LANGUAGE_METADATA_KEY,
    ]);
    const currentUserPromise = getCurrentUser();
    const isAdminPromise = isUserAdmin();
    const agentNamingPromise = getAgentNaming();
    const organizationStatePromise = isAdminPromise.then((isAdmin) =>
        isAdmin ? loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true }) : null,
    );
    const chatPreferencesPromise = getDefaultChatPreferences();
    const customStylesheetCssPromise = resolveOptionalLayoutText(
        'custom stylesheet CSS',
        getAggregatedCustomStylesheetCss,
    );
    const customJavascriptPromise = resolveOptionalLayoutText(
        'custom JavaScript',
        getCustomJavascriptWithIntegrations,
    );
    const cookieStorePromise = cookies();
    const federatedServersPromise = Promise.all([layoutMetadataPromise, currentUserPromise]).then(
        ([layoutMetadata, currentUser]) =>
            getLayoutFederatedServers({
                currentUser,
                showFederatedServersPublicly: (layoutMetadata.SHOW_FEDERATED_SERVERS_PUBLICLY ?? 'false') === 'true',
            }),
    );
    const footerLinksPromise = Promise.all([layoutMetadataPromise, federatedServersPromise]).then(
        ([layoutMetadata, federatedServers]) =>
            [...parseFooterLinks(layoutMetadata.FOOTER_LINKS), ...federatedServers.map(({ title, url }) => ({ title, url }))],
    );

    const [
        isAdmin,
        currentUser,
        layoutMetadata,
        agentNaming,
        organizationState,
        chatPreferences,
        customStylesheetCss,
        customJavascript,
        cookieStore,
        federatedServers,
        footerLinks,
    ] = await Promise.all([
        isAdminPromise,
        currentUserPromise,
        layoutMetadataPromise,
        agentNamingPromise,
        organizationStatePromise,
        chatPreferencesPromise,
        customStylesheetCssPromise,
        customJavascriptPromise,
        cookieStorePromise,
        federatedServersPromise,
        footerLinksPromise,
    ]);

    const serverName = layoutMetadata.SERVER_NAME || 'Promptbook Agents Server';
    const serverLogoUrl = layoutMetadata.SERVER_LOGO_URL || null;
    const isFooterShown = (layoutMetadata.IS_FOOTER_SHOWN ?? 'true') === 'true';
    const agents: AgentOrganizationAgent[] = organizationState?.agents || [];
    const agentFolders: AgentOrganizationFolder[] = organizationState?.folders || [];
    const isExperimental = (layoutMetadata.IS_EXPERIMENTAL_APP ?? 'false') === 'true';
    const isFeedbackEnabled = (layoutMetadata.IS_FEEDBACK_ENABLED ?? 'true') === 'true';
    const isExperimentalPwaAppEnabled = (layoutMetadata.IS_EXPERIMENTAL_PWA_APP_ENABLED ?? 'true') === 'true';
    const safeCustomJavascript = customJavascript.replace(/<\/script>/gi, '<\\/script>');
    const cookieLanguage = cookieStore.get(SERVER_LANGUAGE_COOKIE_NAME)?.value || null;
    const serverLanguage = resolveServerLanguageCode(cookieLanguage || layoutMetadata[SERVER_LANGUAGE_METADATA_KEY]);

    return (
        <html lang={serverLanguage}>
            {/* Note: Icon is set via metadata to allow agent-page specific icons to override it */}
            <body className={`${barlowCondensed.variable} ${poppins.variable} antialiased bg-white text-gray-900`}>
                {customStylesheetCss && <style id="agents-server-custom-css">{customStylesheetCss}</style>}
                <LayoutWrapper
                    isAdmin={isAdmin}
                    currentUser={currentUser}
                    serverName={serverName}
                    serverLogoUrl={serverLogoUrl}
                    agents={JSON.parse(JSON.stringify(agents))}
                    agentFolders={JSON.parse(JSON.stringify(agentFolders))}
                    agentNaming={agentNaming}
                    isFooterShown={isFooterShown}
                    footerLinks={footerLinks}
                    federatedServers={federatedServers}
                    defaultIsSoundsOn={chatPreferences.defaultIsSoundsOn}
                    defaultIsVibrationOn={chatPreferences.defaultIsVibrationOn}
                    isExperimental={isExperimental}
                    isFeedbackEnabled={isFeedbackEnabled}
                    isExperimentalPwaAppEnabled={isExperimentalPwaAppEnabled}
                    defaultServerLanguage={serverLanguage}
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
