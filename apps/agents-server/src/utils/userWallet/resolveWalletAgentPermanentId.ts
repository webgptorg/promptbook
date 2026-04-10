import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { buildAgentNameOrIdFilter } from '../agentIdentifier';

/**
 * Minimal agent row needed to resolve wallet scope identifiers.
 */
type WalletAgentScopeRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'permanentId'>;

/**
 * Resolves one wallet-scope agent identifier into canonical `Agent.permanentId`.
 */
export async function resolveWalletAgentPermanentId(
    agentIdentifier: string | null | undefined,
): Promise<string | null> {
    const normalizedAgentIdentifier = normalizeWalletAgentIdentifier(agentIdentifier);
    if (!normalizedAgentIdentifier) {
        return null;
    }

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTable)
        .select('permanentId')
        .or(buildAgentNameOrIdFilter(normalizedAgentIdentifier))
        .is('deletedAt', null)
        .order('createdAt', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve wallet agent scope: ${error.message}`);
    }

    const row = data as WalletAgentScopeRow | null;
    const permanentId = row?.permanentId?.trim();
    return permanentId || null;
}

/**
 * Normalizes one optional wallet agent identifier.
 *
 * @private function of `resolveWalletAgentPermanentId`
 */
function normalizeWalletAgentIdentifier(agentIdentifier: string | null | undefined): string | null {
    if (typeof agentIdentifier !== 'string') {
        return null;
    }

    const normalizedAgentIdentifier = agentIdentifier.trim();
    return normalizedAgentIdentifier || null;
}
