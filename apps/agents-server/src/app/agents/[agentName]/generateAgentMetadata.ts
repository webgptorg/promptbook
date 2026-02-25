import { $provideServer } from '@/src/tools/$provideServer';
import { Metadata } from 'next';
import { isPublicAgentVisibility } from '../../../utils/agentVisibility';
import { resolvePseudoAgentDescriptor } from '../../../utils/pseudoAgents';
import { getAgentName, getAgentProfile } from './_utils';

/**
 * Generates SEO metadata for agent routes and visibility-aware indexing rules.
 *
 * @param params - Dynamic route parameters with `agentName`.
 * @returns Metadata used by Next.js head rendering.
 */
export async function generateAgentMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    const { publicUrl } = await $provideServer();
    const agentName = await getAgentName(params);
    const pseudoDescriptor = resolvePseudoAgentDescriptor(agentName);

    if (pseudoDescriptor) {
        return {
            metadataBase: publicUrl,
            title: pseudoDescriptor.descriptor.displayName,
            description: pseudoDescriptor.descriptor.summary,
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    try {
        const agentProfile = await getAgentProfile(agentName);
        const canonicalAgentId = agentProfile.permanentId || agentName;

        const title = agentProfile.meta.fullname || agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || undefined;
        const isPublicAgent = isPublicAgentVisibility(agentProfile.visibility);

        // Use the agent's icon-256.png as the favicon
        const iconUrl = `/agents/${encodeURIComponent(canonicalAgentId)}/images/icon-256.png`;

        const canonicalUrl = `/agents/${encodeURIComponent(canonicalAgentId)}`;

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
                url: canonicalUrl,
                images: [{ url: iconUrl, alt: title }],
            },
            twitter: {
                card: 'summary',
                title,
                description,
                images: [iconUrl],
            },
            robots: {
                index: isPublicAgent,
                follow: isPublicAgent,
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
