import { Metadata } from 'next';
import { getAgentName, getAgentProfile } from './_utils';

export async function generateAgentMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    const agentName = await getAgentName(params);

    try {
        const agentProfile = await getAgentProfile(agentName);

        const title = agentProfile.meta.fullname || agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || undefined;

        // Extract image from meta
        const image = agentProfile.meta.image;

        return {
            title,
            description,
            icons: image ? { icon: image } : undefined,
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
        };
    } catch (error) {
        console.warn(`Failed to generate metadata for agent ${agentName}`, error);
        return {
            title: agentName,
        };
    }
}
