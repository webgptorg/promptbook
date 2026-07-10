import faviconLogoImage from '@public/favicon.ico';
import type { Metadata } from 'next';
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
 * Map of metadata.
 */
export const metadata: Metadata = {
    title: 'ptbk coder — Your coding agents, running your backlog',
    description:
        'ptbk coder drives Claude Code, OpenAI Codex, Gemini CLI and other coding agents through a queue of plain-markdown prompts — testing, committing and pushing every change. Part of Promptbook.',
    keywords: [
        'ptbk coder',
        'Promptbook',
        'AI coding agent',
        'coding agent orchestration',
        'Claude Code',
        'OpenAI Codex',
        'GitHub Copilot',
        'Gemini CLI',
        'opencode',
        'Cline',
    ],
    authors: [{ name: 'Promptbook Team' }],
    openGraph: {
        title: 'ptbk coder — Your coding agents, running your backlog',
        description:
            'Queue prompts as markdown files and let your favorite coding agent implement, test and commit them one by one.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ptbk coder — Your coding agents, running your backlog',
        description:
            'Queue prompts as markdown files and let your favorite coding agent implement, test and commit them one by one.',
    },
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
        <html lang="en" className="dark">
            <head>
                <link rel="icon" href={faviconLogoImage.src} type="image/x-icon" />
            </head>
            <body
                className={`${outfit.variable} ${inter.variable} ${jetBrainsMono.variable} font-sans antialiased bg-promptbook-dark-gray text-gray-100`}
            >
                {children}
            </body>
        </html>
    );
}
