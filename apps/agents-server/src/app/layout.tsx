import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import type { Metadata } from 'next';
import { Barlow_Condensed, Poppins } from 'next/font/google';
import { getMetadata } from '../database/getMetadata';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideServer } from '../tools/$provideServer';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getFederatedServers } from '../utils/getFederatedServers';
import { isUserAdmin } from '../utils/isUserAdmin';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-barlow-condensed',
});

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-poppins',
});

export async function generateMetadata(): Promise<Metadata> {
    const { publicUrl } = await $provideServer();
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';
    const serverDescription = (await getMetadata('SERVER_DESCRIPTION')) || 'Agents server powered by Promptbook';
    const serverFaviconUrl = (await getMetadata('SERVER_FAVICON_URL')) || faviconLogoImage.src;

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
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';
    const serverLogoUrl = (await getMetadata('SERVER_LOGO_URL')) || null;
    const isFooterShown = ((await getMetadata('IS_FOOTER_SHOWN')) || 'true') === 'true';

    let footerLinks = [];
    try {
        const footerLinksString = (await getMetadata('FOOTER_LINKS')) || '[]';
        footerLinks = JSON.parse(footerLinksString);
    } catch (error) {
        console.error('Failed to parse FOOTER_LINKS', error);
    }

    // Fetch federated servers and add to footerLinks (only if user is authenticated or SHOW_FEDERATED_SERVERS_PUBLICLY is true)
    let federatedServers: Array<{ url: string; title: string; logoUrl: string | null }> = [];
    try {
        const showFederatedServersPublicly =
            ((await getMetadata('SHOW_FEDERATED_SERVERS_PUBLICLY')) || 'false') === 'true';

        // Only show federated servers in footer if user is authenticated or if SHOW_FEDERATED_SERVERS_PUBLICLY is true
        if (currentUser || showFederatedServersPublicly) {
            const federatedServersUrls = await getFederatedServers();
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

    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    return (
        <html lang="en">
            {/* Note: Icon is set via metadata to allow agent-page specific icons to override it */}
            <body className={`${barlowCondensed.variable} ${poppins.variable} antialiased bg-white text-gray-900`}>
                <LayoutWrapper
                    isAdmin={isAdmin}
                    currentUser={currentUser}
                    serverName={serverName}
                    serverLogoUrl={serverLogoUrl}
                    agents={JSON.parse(JSON.stringify(agents))}
                    isFooterShown={isFooterShown}
                    footerLinks={footerLinks}
                    federatedServers={federatedServers}
                >
                    {children}
                </LayoutWrapper>
                {/* Global portal root for modals/popups */}
                <div id="portal-root" />
            </body>
        </html>
    );
}
