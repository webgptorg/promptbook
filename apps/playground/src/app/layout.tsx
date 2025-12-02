import faviconLogoImage from '@/public/favicon.ico';
import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://playground.ptbk.io'),
    title: 'Promptbook Playground',
    description: 'A showcase of React components for developers using Promptbook technology',
    keywords: ['React', 'Components', 'Promptbook', 'UI', 'Gallery', 'Developers'],
    authors: [{ name: 'Promptbook Team' }],
    openGraph: {
        title: 'Promptbook Playground',
        description: 'A showcase of React components for developers using Promptbook technology',
        type: 'website',
        images: [
            /*
            TODO:
            {
                url: 'https://www.ptbk.io/design',
                width: 1200,
                height: 630,
                alt: 'Promptbook Playground',
            },
            */
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Promptbook Playground',
        description: 'A showcase of React components for developers using Promptbook technology',
        // TODO: images: ['https://www.ptbk.io/design'],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
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
            <body className={`${barlowCondensed.className} antialiased bg-white text-gray-900`}>{children}</body>
        </html>
    );
}
