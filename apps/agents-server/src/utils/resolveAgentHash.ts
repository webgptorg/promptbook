import { $getTableName } from '@/src/database/$getTableName';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';

/**
 * Minimal row used to resolve the current source hash for an agent.
 */
type AgentHashRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'agentHash'>;

/**
 * Resolves an agent identifier (name or permanent id) to the current `Agent.agentHash`.
 *
 * The hash is maintained automatically on every `agentSource` change, so this read
 * is a cheap alternative to loading and hashing the whole agent source.
 *
 * @param agentIdentifier - Agent route identifier, either `agentName` or `permanentId`.
 * @returns Current `agentHash` or `null` when no matching agent exists.
 */
export async function resolveAgentHash(agentIdentifier: string): Promise<string | null> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');

    const { data, error } = await supabase
        .from(agentTable)
        .select('agentHash')
        .or(buildAgentNameOrIdFilter(agentIdentifier))
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return (data as AgentHashRow).agentHash;
}
