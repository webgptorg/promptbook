import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Promptbook Agent Embed',
    description: 'Embedded agent chat widget',
};

/**
 * Minimal layout for the embed page - no header, footer, or other UI elements
 * This layout is completely transparent and only renders the chat widget
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
