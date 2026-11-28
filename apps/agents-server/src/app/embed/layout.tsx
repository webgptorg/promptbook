import type { Metadata } from 'next';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';

/**
 * Generates metadata for the embed page using the configured agent naming.
 *
 * @returns Metadata for the embed layout.
 */
export async function generateMetadata(): Promise<Metadata> {
    const agentNaming = await getAgentNaming();
    return {
        title: formatAgentNamingText('Promptbook Agent Embed', agentNaming),
        description: formatAgentNamingText('Embedded agent chat widget', agentNaming),
    };
}

/**
 * Minimal layout for the embed page.
 *
 * @param children - Embedded page content.
 * @returns Embed layout markup.
 */
export default function EmbedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    overflow: 'hidden',
                }}
            >
                {children}
            </body>
        </html>
    );
}
