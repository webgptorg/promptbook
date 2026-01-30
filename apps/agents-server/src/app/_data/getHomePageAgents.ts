'use server';

import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import { getCurrentUser } from '../../utils/getCurrentUser';

/**
 * Agent data enriched with optional visibility information for the home/dashboard pages.
 */
export type HomePageAgent = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
};

/**
 * Result payload for home/dashboard agents, including the current user snapshot.
 */
export type HomePageAgentsResult = {
    agents: ReadonlyArray<HomePageAgent>;
    currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
};

/**
 * Loads agents for the home/dashboard pages with visibility filtering applied.
 */
export async function getHomePageAgents(): Promise<HomePageAgentsResult> {
    const currentUser = await getCurrentUser();
    const collection = await $provideAgentCollectionForServer();
    const allAgents = await collection.listAgents();

    const supabase = $provideSupabaseForServer();
    const visibilityResult = await supabase
        .from(await $getTableName('Agent'))
        .select('agentName, visibility')
        .is('deletedAt', null);

    if (visibilityResult.error) {
        console.error('Error fetching agent visibility:', visibilityResult.error);
        return { agents: allAgents, currentUser };
    }

    if (!visibilityResult.data) {
        return { agents: allAgents, currentUser };
    }

    const visibilityMap = new Map<string, 'PUBLIC' | 'PRIVATE'>(
        visibilityResult.data.map((item: { agentName: string; visibility: 'PUBLIC' | 'PRIVATE' }) => [
            item.agentName,
            item.visibility,
        ]),
    );

    const agents = allAgents
        .filter((agent) => {
            const visibility = visibilityMap.get(agent.agentName);
            if (!visibility) return false;

            if (currentUser?.isAdmin) return true;
            if (currentUser) return true;
            return visibility === 'PUBLIC';
        })
        .map((agent) => ({
            ...agent,
            visibility: visibilityMap.get(agent.agentName) as 'PUBLIC' | 'PRIVATE',
        }));

    return { agents, currentUser };
}
