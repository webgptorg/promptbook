import faviconLogoImage from '@/public/favicon.ico';
import { LayoutWrapper } from '@/src/components/LayoutWrapper/LayoutWrapper';
import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import { getMetadata } from '../database/getMetadata';
import { isUserAdmin } from '../utils/isUserAdmin';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-barlow-condensed',
});

export const metadata: Metadata = {
    title: 'Promptbook agents server',
    description: '@@@',
    keywords: ['@@@'],
    authors: [{ name: 'Promptbook Team' }],
    openGraph: {
        title: 'Promptbook agents server',
        description: '@@@',
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
        title: 'Promptbook agents server',
        description: '@@@',
        // TODO: images: ['https://www.ptbk.io/design'],
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const isAdmin = await isUserAdmin();
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';

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
                <link rel="icon" href={faviconLogoImage.src} type="image/x-icon" />
            </head>
            <body className={`${barlowCondensed.variable} antialiased bg-white text-gray-900`}>
                <LayoutWrapper isAdmin={isAdmin} serverName={serverName}>
                    {children}
                </LayoutWrapper>
            </body>
        </html>
    );
}
