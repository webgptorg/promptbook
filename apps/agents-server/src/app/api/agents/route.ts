import { $provideServer } from '@/src/tools/$provideServer';
import { getPublicAgentProfileSeoRecords } from '@/src/utils/seo/getPublicAgentProfileSeoRecords';
import { NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';
import { getFederatedServers } from '../../../utils/getFederatedServers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const allAgents = await collection.listAgents();
        const federatedServers = await getFederatedServers();
        const { publicUrl } = await $provideServer();

        const publicSeoRecords = await getPublicAgentProfileSeoRecords();
        const publicCanonicalAgentIds = new Set(publicSeoRecords.map((record) => record.canonicalAgentId));
        const publicAgents = allAgents.filter((agent) => publicCanonicalAgentIds.has(agent.permanentId || agent.agentName));

        const agentsWithUrl = publicAgents.map((agent) => ({
            ...agent,
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

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}
