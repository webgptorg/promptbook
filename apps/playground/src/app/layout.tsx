import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Promptbook Components Gallery',
    description: 'A showcase of React components for developers using Promptbook technology',
    keywords: ['React', 'Components', 'Promptbook', 'UI', 'Gallery', 'Developers'],
    authors: [{ name: 'Promptbook Team' }],
    openGraph: {
        title: 'Promptbook Components Gallery',
        description: 'A showcase of React components for developers using Promptbook technology',
        type: 'website',
        images: [
            /*
            TODO:
            {
                url: 'https://www.ptbk.io/design',
                width: 1200,
                height: 630,
                alt: 'Promptbook Components Gallery',
            },
            */
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Promptbook Components Gallery',
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
                <link
                    rel="icon"
                    href="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                    media="(prefers-color-scheme: light)"
                    type="image/svg+xml"
                />
                {/* Favicon for dark mode */}
                <link
                    rel="icon"
                    href="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                    media="(prefers-color-scheme: dark)"
                    type="image/svg+xml"
                />
                {/* Default favicon as a fallback */}
                <link
                    rel="icon"
                    href="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                    type="image/svg+xml"
                />
            </head>
            <body className={`${inter.className} antialiased bg-white text-gray-900`}>{children}</body>
        </html>
    );
}
