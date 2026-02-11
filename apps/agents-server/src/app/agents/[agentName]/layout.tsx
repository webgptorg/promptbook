'use server';

import type { Metadata } from 'next';
import { getAgentName, getAgentProfile } from './_utils';

export async function generateMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    const agentName = await getAgentName(params);

    try {
        const agentProfile = await getAgentProfile(agentName);

        const title = agentProfile.meta.fullname || agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || undefined;

        // Use the agent's icon-256.png as the favicon for all agent pages and subpages
        const iconUrl = `/agents/${encodeURIComponent(agentName)}/images/icon-256.png`;

        return {
            title,
            description,
            icons: {
                icon: iconUrl,
                shortcut: iconUrl,
                apple: iconUrl,
            },
        };
    } catch (error) {
        console.warn(`Failed to generate metadata for agent ${agentName}`, error);
        return {
            title: agentName,
        };
    }
}

export default async function AgentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
