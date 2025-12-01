import { NEXT_PUBLIC_SITE_URL } from '@/config';
import { NextResponse } from 'next/server';
import { getMetadata } from '../../../database/getMetadata';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const agents = await collection.listAgents();
        const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
        const federatedServers = federatedServersString
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');

        const agentsWithUrl = agents.map((agent) => ({
            ...agent,
            url: `${NEXT_PUBLIC_SITE_URL.href}agents/${encodeURIComponent(agent.agentName)}`,
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
