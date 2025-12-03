import { $provideServer } from '@/src/tools/$provideServer';
import { NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';
import { getFederatedServersFromMetadata } from '../../../utils/getFederatedServersFromMetadata';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const agents = await collection.listAgents();
        const federatedServers = await getFederatedServersFromMetadata();
        const { publicUrl } = await $provideServer();

        const agentsWithUrl = agents.map((agent) => ({
            ...agent,
            url: `${publicUrl.href}agents/${encodeURIComponent(agent.agentName)}`,
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
