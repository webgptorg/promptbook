import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { OwnedAgentFolderRow } from '../agentOwnership';

/**
 * Maps one persisted folder row into the management API payload shape.
 *
 * @param row - Persisted folder row.
 * @returns JSON-serializable folder payload.
 */
export function mapOwnedFolderRowToManagementFolder(row: OwnedAgentFolderRow) {
    return {
        id: row.id,
        name: row.name,
        parentId: row.parentId ?? null,
        sortOrder: row.sortOrder ?? 0,
        icon: row.icon ?? null,
        color: row.color ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? null,
    };
}

/**
 * Computes the next sort order for one user-owned folder position.
 *
 * @param userId - Owner identifier.
 * @param parentId - Target parent folder identifier or `null` for root.
 * @returns Sort order appended after the current sibling set.
 */
export async function getNextOwnedFolderSortOrder(userId: number, parentId: number | null): Promise<number> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('AgentFolder');
    let query = supabase
        .from(tableName)
        .select('sortOrder')
        .eq('userId', userId as never)
        .is('deletedAt', null)
        .order('sortOrder', { ascending: false })
        .limit(1);

    query =
        parentId === null
            ? query.is('parentId', null)
            : query.eq('parentId', parentId as never);

    const result = await query.maybeSingle();
    if (result.error) {
        throw new Error(`Failed to compute next folder sort order: ${result.error.message}`);
    }

    return ((result.data as { sortOrder?: number } | null)?.sortOrder ?? 0) + 1;
}
