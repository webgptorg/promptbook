import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../database/schema';
import { buildAgentNameOrIdFilter } from './agentIdentifier';

/**
 * Agent row shape used by owner-aware helpers.
 */
export type OwnedAgentRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    | 'id'
    | 'agentName'
    | 'createdAt'
    | 'updatedAt'
    | 'permanentId'
    | 'agentHash'
    | 'agentSource'
    | 'agentProfile'
    | 'promptbookEngineVersion'
    | 'folderId'
    | 'sortOrder'
    | 'deletedAt'
    | 'visibility'
> & {
    /**
     * Database user that owns the agent.
     */
    userId: number | null;
};

/**
 * Folder row shape used by owner-aware helpers.
 */
export type OwnedAgentFolderRow = Pick<
    AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'],
    'id' | 'name' | 'parentId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'sortOrder' | 'icon' | 'color'
> & {
    /**
     * Database user that owns the folder.
     */
    userId: number | null;
};

/**
 * Assigns one persisted agent row to the provided owner.
 *
 * @param permanentId - Stable agent identifier.
 * @param userId - Owning user identifier.
 */
export async function assignAgentOwner(permanentId: string, userId: number): Promise<void> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    const result = await supabase.from(tableName).update({ userId } as never).eq('permanentId', permanentId);

    if (result.error) {
        throw new Error(`Failed to assign owner for agent "${permanentId}": ${result.error.message}`);
    }
}

/**
 * Loads one owner-scoped agent using permanent id first and agent name as fallback.
 *
 * @param userId - Owner identifier.
 * @param identifier - Permanent id or agent name.
 * @returns Matching agent row when exactly one row is found.
 */
export async function findOwnedAgentByIdentifier(userId: number, identifier: string): Promise<OwnedAgentRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(tableName)
        .select(OWNED_AGENT_ROW_COLUMNS)
        .eq('userId', userId as never)
        .or(buildAgentNameOrIdFilter(identifier))
        .limit(10);

    if (error) {
        throw new Error(`Failed to load agent "${identifier}": ${error.message}`);
    }

    return pickAgentRowByIdentifier((data || []) as unknown as OwnedAgentRow[], identifier, 'for this owner');
}

/**
 * Loads one agent by permanent id or agent name without an owner restriction.
 *
 * Owner-aware callers should use {@link findOwnedAgentByIdentifier}; this helper is reserved for administrative
 * overrides where the caller has been independently authorized to read or mutate any agent.
 *
 * @param identifier - Permanent id or agent name.
 * @returns Matching agent row or `null` when nothing matches.
 */
export async function findAgentByIdentifier(identifier: string): Promise<OwnedAgentRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(tableName)
        .select(OWNED_AGENT_ROW_COLUMNS)
        .or(buildAgentNameOrIdFilter(identifier))
        .limit(10);

    if (error) {
        throw new Error(`Failed to load agent "${identifier}": ${error.message}`);
    }

    return pickAgentRowByIdentifier((data || []) as unknown as OwnedAgentRow[], identifier, 'across agents');
}

/**
 * Database columns selected for every agent row exposed by ownership-aware helpers.
 */
const OWNED_AGENT_ROW_COLUMNS =
    'id, agentName, createdAt, updatedAt, permanentId, agentHash, agentSource, agentProfile, promptbookEngineVersion, folderId, sortOrder, deletedAt, visibility, userId';

/**
 * Disambiguates a list of agent rows that all matched the same identifier.
 *
 * Resolution order:
 * 1. Exact `permanentId` match — always preferred because permanent ids are unique.
 * 2. Single `agentName` match — preserves the legacy lookup by human-readable name.
 * 3. Single remaining row — accepts the only candidate found.
 *
 * @param rows - Candidate agent rows returned by Supabase.
 * @param identifier - Identifier that was searched.
 * @param ambiguityScope - Human-readable scope used in the ambiguity error message.
 * @returns Best-matching row or `null` when no candidate matches.
 */
function pickAgentRowByIdentifier(
    rows: OwnedAgentRow[],
    identifier: string,
    ambiguityScope: string,
): OwnedAgentRow | null {
    if (rows.length === 0) {
        return null;
    }

    const permanentIdMatch = rows.find((row) => row.permanentId === identifier);
    if (permanentIdMatch) {
        return permanentIdMatch;
    }

    const agentNameMatches = rows.filter((row) => row.agentName === identifier);
    if (agentNameMatches.length === 1) {
        return agentNameMatches[0] || null;
    }

    if (rows.length === 1) {
        return rows[0] || null;
    }

    throw new Error(
        `Agent identifier "${identifier}" is ambiguous ${ambiguityScope}. Use the stable \`permanentId\` returned by the API.`,
    );
}

/**
 * Loads one owner-scoped folder by numeric identifier.
 *
 * @param userId - Owner identifier.
 * @param folderId - Folder identifier.
 * @returns Matching folder row or `null`.
 */
export async function findOwnedFolderById(userId: number, folderId: number): Promise<OwnedAgentFolderRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('AgentFolder');
    const { data, error } = await supabase
        .from(tableName)
        .select('id, name, parentId, createdAt, updatedAt, deletedAt, sortOrder, icon, color, userId')
        .eq('id', folderId)
        .eq('userId', userId as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load folder "${folderId}": ${error.message}`);
    }

    return (data as unknown as OwnedAgentFolderRow | null) || null;
}
