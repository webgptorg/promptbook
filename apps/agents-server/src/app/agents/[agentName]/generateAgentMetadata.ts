import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { parseAgentSource } from '@promptbook-local/core';
import { Metadata } from 'next';

export async function generateAgentMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agentProfile = parseAgentSource(agentSource);

        const title = agentProfile.meta.fullname || agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || undefined;

        // Extract image from meta
        const image = agentProfile.meta.image;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'website',
                images: image ? [{ url: image }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: image ? [image] : undefined,
            },
        };
    } catch (error) {
        console.warn(`Failed to generate metadata for agent ${agentName}`, error);
        return {
            title: agentName,
        };
    }
}
