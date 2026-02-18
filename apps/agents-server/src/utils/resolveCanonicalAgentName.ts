import { $getTableName } from '@/src/database/$getTableName';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';

/**
 * Minimal row used to resolve the canonical name for an agent.
 */
type CanonicalAgentNameRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'agentName'>;

/**
 * Resolves an agent identifier (name or permanent id) to canonical `Agent.agentName`.
 *
 * @param agentIdentifier - Agent route identifier, either `agentName` or `permanentId`.
 * @returns Canonical `agentName` or `null` when no matching agent exists.
 */
export async function resolveCanonicalAgentName(agentIdentifier: string): Promise<string | null> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');

    const { data, error } = await supabase
        .from(agentTable)
        .select('agentName')
        .or(buildAgentNameOrIdFilter(agentIdentifier))
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return (data as CanonicalAgentNameRow).agentName;
}
