import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import { Metadata } from 'next';
import { isPublicAgentVisibility } from '../../../utils/agentVisibility';
import { resolvePseudoAgentDescriptor } from '../../../utils/pseudoAgents';
import { isPublicServerVisibility } from '../../../utils/serverVisibility';
import { getAgentName, getAgentProfile } from './_utils';

/**
 * Generates SEO metadata for agent routes and visibility-aware indexing rules.
 *
 * @param params - Dynamic route parameters with `agentName`.
 * @returns Metadata used by Next.js head rendering.
 */
export async function generateAgentMetadata({ params }: { params: Promise<{ agentName: string }> }): Promise<Metadata> {
    const [{ publicUrl }, serverVisibility] = await Promise.all([$provideServer(), getServerVisibility()]);
    const isPublicServer = isPublicServerVisibility(serverVisibility);
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
        const isIndexable = isPublicServer && isPublicAgentVisibility(agentProfile.visibility);

        // Use the agent's icon-256.png as the favicon
        const iconUrl = `/agents/${encodeURIComponent(canonicalAgentId)}/images/icon-256.png`;

        const canonicalUrl = `/agents/${encodeURIComponent(canonicalAgentId)}`;

        const baseMetadata = {
            metadataBase: publicUrl,
            title,
            description,
            manifest: `/agents/${encodeURIComponent(canonicalAgentId)}/manifest.webmanifest`,
            icons: {
                icon: iconUrl,
                shortcut: iconUrl,
                apple: iconUrl,
            },
            robots: {
                index: isIndexable,
                follow: isIndexable,
            },
        } satisfies Metadata;

        if (!isIndexable) {
            return baseMetadata;
        }

        return {
            ...baseMetadata,
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
        } satisfies Metadata;
    } catch (error) {
        console.warn(`Failed to generate metadata for agent ${agentName}`, error);
        return {
            title: agentName,
        };
    }
}
