import { $provideServer } from '@/src/tools/$provideServer';
import { NextResponse } from 'next/server';
import { getMetadata } from '../../../database/getMetadata';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';
import { getEffectiveFederatedServers } from '../../../utils/getEffectiveFederatedServers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const agents = await collection.listAgents();
        const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
        const federatedServers = getEffectiveFederatedServers(federatedServersString);
        const { publicUrl } = await $provideServer();

        const agentsWithUrl = agents.map((agent) => ({
            ...agent,
            url: `${publicUrl.href}agents/${encodeURIComponent(agent.agentName)}`,
        }));

        return NextResponse.json({
            agents: agentsWithUrl,
            federatedServers,
        });
    } catch (error) {
        console.error('Error fetching agents:', error);
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}
