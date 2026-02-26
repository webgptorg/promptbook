import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import type { Metadata } from 'next';
import { Barlow_Condensed, Poppins } from 'next/font/google';
import { cookies } from 'next/headers';
import { getCurrentCustomJavascriptText } from '../database/customJavascript';
import { getCurrentCustomStylesheetCss } from '../database/customStylesheet';
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

export async function generateMetadata(): Promise<Metadata> {
    const { publicUrl } = await $provideServer();
    const metadata = await getMetadataMap(['SERVER_NAME', 'SERVER_DESCRIPTION', 'SERVER_FAVICON_URL']);
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
    const isAdmin = await isUserAdmin();
    const currentUser = await getCurrentUser();
    const layoutMetadata = await getMetadataMap([
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
    const serverName = layoutMetadata.SERVER_NAME || 'Promptbook Agents Server';
    const serverLogoUrl = layoutMetadata.SERVER_LOGO_URL || null;
    const isFooterShown = (layoutMetadata.IS_FOOTER_SHOWN ?? 'true') === 'true';
    const agentNaming = await getAgentNaming();

    let footerLinks = [];
    try {
        const footerLinksString = layoutMetadata.FOOTER_LINKS || '[]';
        footerLinks = JSON.parse(footerLinksString);
    } catch (error) {
        console.error('Failed to parse FOOTER_LINKS', error);
    }

    // Fetch federated servers and add to footerLinks (only if user is authenticated or SHOW_FEDERATED_SERVERS_PUBLICLY is true)
    let federatedServers: Array<{ url: string; title: string; logoUrl: string | null }> = [];
    try {
        const showFederatedServersPublicly = (layoutMetadata.SHOW_FEDERATED_SERVERS_PUBLICLY ?? 'false') === 'true';

        // Only show federated servers in footer if user is authenticated or if SHOW_FEDERATED_SERVERS_PUBLICLY is true
        if (currentUser || showFederatedServersPublicly) {
            const federatedServersUrls = await getFederatedServers({ excludeHiddenCoreServer: true });
            federatedServers = await Promise.all(
                federatedServersUrls.map(async (url: string) => {
                    let logoUrl: string | null = null;
                    try {
                        // Try to fetch logo from metadata endpoint if available
                        const res = await fetch(`${url}/api/metadata`);
                        if (res.ok) {
                            const meta = await res.json();
                            logoUrl = meta.SERVER_LOGO_URL || null;
                        }
                    } catch {
                        logoUrl = null;
                    }
                    return {
                        title: `Federated: ${new URL(url).hostname}`,
                        url,
                        logoUrl,
                    };
                }),
            );
            footerLinks = [...footerLinks, ...federatedServers];
        }
    } catch (error) {
        console.error('Failed to fetch federated servers for footer', error);
    }

    let agents: AgentOrganizationAgent[] = [];
    let agentFolders: AgentOrganizationFolder[] = [];
    if (isAdmin) {
        const organizationState = await loadAgentOrganizationState({ status: 'ACTIVE', includePrivate: true });
        agents = organizationState.agents;
        agentFolders = organizationState.folders;
    }

    const chatPreferences = await getDefaultChatPreferences();
    const isExperimental = (layoutMetadata.IS_EXPERIMENTAL_APP ?? 'false') === 'true';
    const isFeedbackEnabled = (layoutMetadata.IS_FEEDBACK_ENABLED ?? 'true') === 'true';
    const isExperimentalPwaAppEnabled = (layoutMetadata.IS_EXPERIMENTAL_PWA_APP_ENABLED ?? 'true') === 'true';
    let customStylesheetCss = '';
    let customJavascript = '';

    try {
        customStylesheetCss = await getCurrentCustomStylesheetCss();
    } catch (error) {
        console.error('Failed to load custom stylesheet CSS', error);
    }

    try {
        customJavascript = await getCurrentCustomJavascriptText();
    } catch (error) {
        console.error('Failed to load custom JavaScript', error);
    }

    const safeCustomJavascript = customJavascript.replace(/<\/script>/gi, '<\\/script>');
    const cookieStore = await cookies();
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
