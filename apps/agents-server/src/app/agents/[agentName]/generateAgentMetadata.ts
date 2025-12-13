import { $provideServer } from '@/src/tools/$provideServer';
import { Metadata } from 'next';
import { getAgentName, getAgentProfile } from './_utils';

export async function generateAgentMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    const { publicUrl } = await $provideServer();
    const agentName = await getAgentName(params);

    try {
        const agentProfile = await getAgentProfile(agentName);

        const title = agentProfile.meta.fullname || agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || undefined;

        // Use the agent's icon-256.png as the favicon
        const iconUrl = `/agents/${encodeURIComponent(agentName)}/images/icon-256.png`;

        const canonicalUrl = `/agents/${encodeURIComponent(agentProfile.permanentId || agentName)}`;

        const metadata = {
            metadataBase: publicUrl,
            title,
            description,
            icons: {
                icon: iconUrl,
                shortcut: iconUrl,
                apple: iconUrl,
            },
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                title,
                description,
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
            },
        } satisfies Metadata;

        return metadata;
    } catch (error) {
        console.warn(`Failed to generate metadata for agent ${agentName}`, error);
        return {
            title: agentName,
        };
    }
}
