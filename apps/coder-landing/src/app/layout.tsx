import type { Metadata } from 'next';
import './globals.css';

/**
 * Metadata for the ptbk coder landing page.
 *
 * @private internal metadata of the coder landing app
 */
export const metadata: Metadata = {
    title: 'ptbk coder - AI coding agents for prompt queues',
    description:
        'Landing page for ptbk coder, a Promptbook CLI workflow for running AI coding agents through prompt files, tests, commits, and a local kanban server.',
    keywords: ['ptbk coder', 'Promptbook', 'AI coding agent', 'CLI coding agent', 'Claude Code', 'OpenAI Codex'],
    authors: [{ name: 'Promptbook Team' }],
    openGraph: {
        title: 'ptbk coder',
        description: 'Run AI coding agents through prompt files, tests, commits, and a local kanban server.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ptbk coder',
        description: 'Run AI coding agents through prompt files, tests, commits, and a local kanban server.',
    },
};

/**
 * Root layout for the ptbk coder landing app.
 *
 * @private internal layout of the coder landing app
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
