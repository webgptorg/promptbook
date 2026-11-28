import { $provideServer } from '@/src/tools/$provideServer';
import { getMetadataMap } from '../../../database/getMetadata';
import { NextResponse } from 'next/server';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    resolveDefaultAgentAvatarVisualId,
} from '../../../constants/defaultAgentAvatarVisual';
import { loadLocalOrganizationSearchDataset } from '../../../search/createDefaultServerSearchProviders/loadLocalOrganizationSearchDataset';
import { getFederatedServers } from '../../../utils/getFederatedServers';

/**
 * Constant for dynamic.
 */
export const dynamic = 'force-dynamic';

/**
 * Handles get.
 */
export async function GET() {
    try {
        const [dataset, federatedServers, { publicUrl }, metadata] = await Promise.all([
            loadLocalOrganizationSearchDataset({ includePrivate: false }),
            getFederatedServers(),
            $provideServer(),
            getMetadataMap([DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY]),
        ]);
        const agentsWithUrl = dataset.agents.map((agent) => ({
            ...agent.resolvedAgentProfile,
            agentName: agent.agentName,
            permanentId: agent.permanentId || undefined,
            url: `${publicUrl.href}agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`,
        }));
        const defaultAgentAvatarVisualId = resolveDefaultAgentAvatarVisualId(
            metadata[DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY],
        );

        const response = NextResponse.json({
            agents: agentsWithUrl,
            federatedServers,
            defaultAgentAvatarVisualId,
        });

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;
    } catch (error) {
        console.error('Error fetching agents:', error);
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}

/**
 * Handles options.
 */
export async function OPTIONS() {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}
