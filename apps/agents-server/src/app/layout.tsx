import faviconLogoImage from '@/public/favicon.ico';
import { Header } from '@/src/components/Header/Header';
import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import { isUserAdmin } from '../utils/isUserAdmin';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
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
            <body className={`${barlowCondensed.className} antialiased bg-white text-gray-900`}>
                <Header isAdmin={isAdmin} />
                <main className="pt-16">{children}</main>
            </body>
        </html>
    );
}
