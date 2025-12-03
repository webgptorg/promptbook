import { NextResponse } from 'next/server';
import { getFederatedAgents } from '../../../utils/getFederatedAgents';
import { getFederatedServersFromMetadata } from '../../../utils/getFederatedServersFromMetadata';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const federatedServers = await getFederatedServersFromMetadata();
        const agentsByServer = await getFederatedAgents(federatedServers);

        return NextResponse.json({
            agentsByServer,
        });
    } catch (error) {
        console.error('Error fetching federated agents:', error);
        return NextResponse.json({ error: 'Failed to fetch federated agents' }, { status: 500 });
    }
}
