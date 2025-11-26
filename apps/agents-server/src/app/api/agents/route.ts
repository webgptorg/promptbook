import { NextResponse } from 'next/server';
import { getMetadata } from '../../../database/getMetadata';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const agents = await collection.listAgents();
        const serverUrl = (await getMetadata('SERVER_URL')) || '';
        const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
        const federatedServers = federatedServersString
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');

        const agentsWithUrl = agents.map((agent) => ({
            ...agent,
            url: `${serverUrl}/${agent.agentName}`,
        }));

        return NextResponse.json({
            agents: agentsWithUrl,
            federatedServers,
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agents' },
            { status: 500 },
        );
    }
}
