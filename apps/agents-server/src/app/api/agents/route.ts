import { $provideServer } from '@/src/tools/$provideServer';
import { NextResponse } from 'next/server';
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
        const dataset = await loadLocalOrganizationSearchDataset({ includePrivate: false });
        const federatedServers = await getFederatedServers();
        const { publicUrl } = await $provideServer();
        const agentsWithUrl = dataset.agents.map((agent) => ({
            ...agent.resolvedAgentProfile,
            agentName: agent.agentName,
            permanentId: agent.permanentId || undefined,
            url: `${publicUrl.href}agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`,
        }));

        const response = NextResponse.json({
            agents: agentsWithUrl,
            federatedServers,
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
