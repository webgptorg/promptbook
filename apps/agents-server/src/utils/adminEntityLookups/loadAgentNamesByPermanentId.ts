import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Minimal agent lookup row needed to name the agent behind one admin row.
 *
 * @private type of `loadAgentNamesByPermanentId`
 */
type AgentNameLookupRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'permanentId' | 'agentName'>;

/**
 * Loads agent names keyed by permanent id, for admin listings that only store the permanent id.
 *
 * @param agentPermanentIds - Permanent ids of the agents to name, duplicates allowed.
 * @returns Agent names keyed by permanent id, empty when nothing was asked for.
 *
 * @private internal admin utility of Agents Server
 */
export async function loadAgentNamesByPermanentId(
    agentPermanentIds: ReadonlyArray<string>,
): Promise<Map<string, string | null>> {
    const uniqueAgentPermanentIds = [...new Set(agentPermanentIds)].filter(Boolean);

    if (uniqueAgentPermanentIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTable)
        .select('permanentId,agentName')
        .in('permanentId', uniqueAgentPermanentIds);

    if (error) {
        throw new Error(`Failed to load admin listing agents: ${error.message}`);
    }

    return new Map(
        ((data || []) as Array<AgentNameLookupRow>)
            .filter((agentRow): agentRow is AgentNameLookupRow & { permanentId: string } => Boolean(agentRow.permanentId))
            .map((agentRow) => [agentRow.permanentId, agentRow.agentName] as const),
    );
}
