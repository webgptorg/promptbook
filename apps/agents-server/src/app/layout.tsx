import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import { getMetadata } from '../database/getMetadata';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideServer } from '../tools/$provideServer';
import { isUserAdmin } from '../utils/isUserAdmin';
import { getCurrentUser } from '../utils/getCurrentUser';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-barlow-condensed',
});

export async function generateMetadata(): Promise<Metadata> {
    const { publicUrl } = await $provideServer();
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';
    const serverDescription = (await getMetadata('SERVER_DESCRIPTION')) || 'Agents server powered by Promptbook';

    return {
        title: serverName,
        description: serverDescription,
        // TODO: keywords: ['@@@'],
        authors: [{ name: 'Promptbook Team' }],
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
    const serverFaviconUrl = (await getMetadata('SERVER_FAVICON_URL')) || faviconLogoImage.src;

    let footerLinks = [];
    try {
        const footerLinksString = (await getMetadata('FOOTER_LINKS')) || '[]';
        footerLinks = JSON.parse(footerLinksString);
    } catch (error) {
        console.error('Failed to parse FOOTER_LINKS', error);
    }

    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    return (
        <html lang="en">
            <head>
                {/* Favicon for light mode */}
                {/*
                <link
                    rel="icon"
                    href="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                    media="(prefers-color-scheme: light)"
                    type="image/svg+xml"
                />
                */}
                {/* Favicon for dark mode */}
                {/*
                <link
                    rel="icon"
                    href="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                    media="(prefers-color-scheme: dark)"
                    type="image/svg+xml"
                />
                */}
                {/* Default favicon as a fallback */}
                <link rel="icon" href={serverFaviconUrl} type="image/x-icon" />
            </head>
            <body className={`${barlowCondensed.variable} antialiased bg-white text-gray-900`}>
                <LayoutWrapper
                    isAdmin={isAdmin}
                    currentUser={currentUser}
                    serverName={serverName}
                    serverLogoUrl={serverLogoUrl}
                    agents={JSON.parse(JSON.stringify(agents))}
                    footerLinks={footerLinks}
                >
                    {children}
                </LayoutWrapper>
                {/* Global portal root for modals/popups */}
                <div id="portal-root" />
            </body>
        </html>
    );
}
