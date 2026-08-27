import { PROMPTBOOK_URL } from '@/data/links';
import {
    PUBLISHER_LEGAL_NAME,
    PUBLISHER_NAME,
    SITE_DESCRIPTION,
    SITE_FAVICON_PATH,
    SITE_KEYWORDS,
    SITE_LANGUAGE,
    SITE_LOCALE,
    SITE_LOGO_PATH,
    SITE_NAME,
    SITE_SOCIAL_DESCRIPTION,
    SITE_THEME_COLOR,
    SITE_TITLE,
    SITE_URL,
} from '@/data/siteMetadata';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';
import './globals.css';

/**
 * Headline font of the Promptbook branding, see https://www.ptbk.io/branding
 */
const outfit = Outfit({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-outfit',
});

/**
 * Body font of the Promptbook branding, see https://www.ptbk.io/branding
 */
const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
});

/**
 * Monospace font used for all terminal samples.
 */
const jetBrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-jetbrains-mono',
});

/**
 * Metadata of the page for search engines, social networks and browsers.
 *
 * Note: Every value comes from [`siteMetadata`](../data/siteMetadata.ts) so that the page, the sharing image,
 *       the structured data and the sitemap can never disagree about what `ptbk coder` is,
 *       specified in [`specs/metadata.md`](../../specs/metadata.md)
 *
 * Note: The sharing image itself is added by the [`opengraph-image`](./opengraph-image.tsx)
 *       and [`twitter-image`](./twitter-image.tsx) file conventions of Next.js
 */
export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [...SITE_KEYWORDS],
    authors: [{ name: PUBLISHER_NAME, url: PROMPTBOOK_URL }],
    creator: PUBLISHER_NAME,
    publisher: PUBLISHER_LEGAL_NAME,
    category: 'technology',
    alternates: {
        canonical: '/',
    },
    icons: {
        icon: SITE_FAVICON_PATH,
        shortcut: SITE_FAVICON_PATH,
        apple: SITE_LOGO_PATH,
    },
    openGraph: {
        type: 'website',
        url: SITE_URL,
        siteName: SITE_NAME,
        title: SITE_TITLE,
        description: SITE_SOCIAL_DESCRIPTION,
        locale: SITE_LOCALE,
    },
    twitter: {
        card: 'summary_large_image',
        title: SITE_TITLE,
        description: SITE_SOCIAL_DESCRIPTION,
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    formatDetection: {
        telephone: false,
    },
};

/**
 * Viewport of the page, which tells the browser that the page is dark and which color its chrome should take.
 */
export const viewport: Viewport = {
    themeColor: SITE_THEME_COLOR,
    colorScheme: 'dark',
};

/**
 * Handles root layout.
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang={SITE_LANGUAGE} className="dark">
            <body
                className={`${outfit.variable} ${inter.variable} ${jetBrainsMono.variable} font-sans antialiased bg-promptbook-dark-gray text-gray-100`}
            >
                {children}
            </body>
        </html>
    );
}
