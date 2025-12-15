import { $getTableName } from '@/src/database/$getTableName';
import { $provideServer } from '@/src/tools/$provideServer';
import { NextResponse } from 'next/server';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '../../../tools/$provideAgentCollectionForServer';
import { getFederatedServersFromMetadata } from '../../../utils/getFederatedServersFromMetadata';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const collection = await $provideAgentCollectionForServer();
        const allAgents = await collection.listAgents();
        const federatedServers = await getFederatedServersFromMetadata();
        const { publicUrl, tablePrefix } = await $provideServer();

        // Filter to only include PUBLIC agents for federated API
        const supabase = $provideSupabaseForServer();
        const visibilityResult = await supabase
            .from(await $getTableName(`Agent`))
            .select('agentName, visibility')
            .is('deletedAt', null);

        let publicAgents = allAgents;
        if (!visibilityResult.error) {
            const visibilityMap = new Map(
                visibilityResult.data.map((item: { agentName: string; visibility: 'PUBLIC' | 'PRIVATE' }) => [
                    item.agentName,
                    item.visibility,
                ]),
            );

            // Only include PUBLIC agents in federated API
            publicAgents = allAgents.filter((agent) => {
                const visibility = visibilityMap.get(agent.agentName);
                return visibility === 'PUBLIC';
            });
        }

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
