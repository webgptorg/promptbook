import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { $provideAgentReferenceResolver } from '../agentReferenceResolver/$provideAgentReferenceResolver';
import { getCurrentUser } from '../getCurrentUser';
import { getWellKnownAgentUrl } from '../getWellKnownAgentUrl';
import { resolveCurrentOrInternalServerOrigin } from '../resolveCurrentOrInternalServerOrigin';
import { resolveStoredAgentStates } from '../resolveStoredAgentState';
import { buildFolderTree, collectAncestorFolderIds } from './folderTree';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationLoadOptions,
    AgentOrganizationLoadResult,
} from './types';

/**
 * Type describing agent row.
 */
type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];
/**
 * Type describing agent folder row.
 */
type AgentFolderRow = AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'];

/**
 * Organization visibility scopes supported by the shared loader.
 */
type AgentOrganizationVisibilityScope = 'all' | 'public';

/**
 * Resolved organization snapshot reused across repeated active-page navigations.
 */
type ResolvedAgentOrganizationSnapshot = {
    agents: AgentOrganizationAgent[];
    folders: AgentOrganizationFolder[];
};

/**
 * Short-lived cache lifetime for fully resolved active organization snapshots.
 *
 * This keeps repeated page navigations from reparsing the same agents while
 * still letting edits appear quickly without explicit invalidation wiring.
 */
const ACTIVE_ORGANIZATION_STATE_CACHE_TTL_MS = 10_000;

/**
 * In-memory cache for active organization snapshots keyed by table names and visibility scope.
 */
const cachedActiveOrganizationSnapshotByKey = new Map<
    string,
    {
        readonly loadedAt: number;
        readonly snapshotPromise: Promise<ResolvedAgentOrganizationSnapshot>;
    }
>();

/**
 * Converts a database agent row into the organization payload.
 *
 * @param row - Raw agent row from Supabase.
 * @returns Agent payload enriched with organization metadata.
 */
function mapAgentRowToOrganizationAgent(
    row: Pick<AgentRow, 'agentName' | 'permanentId' | 'visibility' | 'folderId' | 'sortOrder'> & {
        resolvedAgentProfile: AgentBasicInformation;
    },
): AgentOrganizationAgent {
    const profile = row.resolvedAgentProfile;

    return {
        ...profile,
        agentName: row.agentName,
        permanentId: row.permanentId || profile.permanentId,
        visibility: row.visibility,
        folderId: row.folderId ?? null,
        sortOrder: row.sortOrder ?? 0,
    };
}

/**
 * Converts a database folder row into the organization payload.
 *
 * @param row - Raw folder row from Supabase.
 * @returns Folder payload with organization metadata.
 */
function mapFolderRowToOrganizationFolder(
    row: Pick<AgentFolderRow, 'id' | 'name' | 'parentId' | 'sortOrder'> & { icon: string | null; color: string | null },
): AgentOrganizationFolder {
    return {
        id: row.id,
        name: row.name,
        parentId: row.parentId ?? null,
        sortOrder: row.sortOrder ?? 0,
        icon: row.icon ?? null,
        color: row.color ?? null,
    };
}

/**
 * Builds a stable cache key for one resolved active organization snapshot.
 *
 * @param options - Table names and visibility scope for the requested snapshot.
 * @returns Stable cache key.
 */
function createActiveOrganizationSnapshotCacheKey(options: {
    agentTable: string;
    folderTable: string;
    visibilityScope: AgentOrganizationVisibilityScope;
}): string {
    return [options.agentTable, options.folderTable, options.visibilityScope].join('|');
}

/**
 * Reads one cached active organization snapshot when it is still fresh.
 *
 * @param cacheKey - Snapshot cache key.
 * @returns Cached snapshot promise or `null` when missing/stale.
 */
function readCachedActiveOrganizationSnapshot(
    cacheKey: string,
): Promise<ResolvedAgentOrganizationSnapshot> | null {
    const cachedSnapshot = cachedActiveOrganizationSnapshotByKey.get(cacheKey);
    if (!cachedSnapshot) {
        return null;
    }

    if (Date.now() - cachedSnapshot.loadedAt >= ACTIVE_ORGANIZATION_STATE_CACHE_TTL_MS) {
        cachedActiveOrganizationSnapshotByKey.delete(cacheKey);
        return null;
    }

    return cachedSnapshot.snapshotPromise;
}

/**
 * Loads and resolves agents/folders for one organization visibility scope.
 *
 * @param options - Status, tables, and visibility scope to load.
 * @returns Fully resolved organization snapshot.
 */
async function loadResolvedOrganizationSnapshot(options: {
    status: AgentOrganizationLoadOptions['status'];
    visibilityScope: AgentOrganizationVisibilityScope;
    agentTable: string;
    folderTable: string;
}): Promise<ResolvedAgentOrganizationSnapshot> {
    const supabase = $provideSupabaseForServer();
    const agentQuery = supabase
        .from(options.agentTable)
        .select('agentName, agentSource, permanentId, visibility, folderId, sortOrder, deletedAt');
    const folderQuery = supabase
        .from(options.folderTable)
        .select('id, name, parentId, sortOrder, icon, color, deletedAt');

    if (options.status === 'RECYCLE_BIN') {
        agentQuery.not('deletedAt', 'is', null);
        folderQuery.not('deletedAt', 'is', null);
    } else {
        agentQuery.is('deletedAt', null);
        folderQuery.is('deletedAt', null);
    }

    if (options.visibilityScope === 'public') {
        agentQuery.eq('visibility', 'PUBLIC');
    }

    const [agentResult, folderResult] = await Promise.all([agentQuery, folderQuery]);

    if (agentResult.error) {
        throw new Error(`Failed to load agents: ${agentResult.error.message}`);
    }

    if (folderResult.error) {
        throw new Error(`Failed to load folders: ${folderResult.error.message}`);
    }

    const localServerUrl = await resolveCurrentOrInternalServerOrigin();
    const agentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgents = await resolveStoredAgentStates(
        (agentResult.data || []) as Array<
            Pick<AgentRow, 'agentName' | 'agentSource' | 'permanentId' | 'visibility' | 'folderId' | 'sortOrder'>
        >,
        {
            localServerUrl,
            adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
            agentReferenceResolver,
        },
    );
    const agents = resolvedAgents.map((agent) =>
        mapAgentRowToOrganizationAgent({
            ...agent,
            resolvedAgentProfile: agent.resolvedAgentProfile,
        }),
    );
    const folders = (folderResult.data || []).map(mapFolderRowToOrganizationFolder);

    if (options.visibilityScope === 'all') {
        return { agents, folders };
    }

    const { folderById } = buildFolderTree(folders);
    const visibleFolderIds = new Set<number>();

    for (const agent of agents) {
        if (agent.folderId === null) {
            continue;
        }
        const ancestors = collectAncestorFolderIds(agent.folderId, folderById);
        for (const ancestorId of ancestors) {
            visibleFolderIds.add(ancestorId);
        }
    }

    return {
        agents,
        folders: folders.filter((folder) => visibleFolderIds.has(folder.id)),
    };
}

/**
 * Loads one active organization snapshot through the short-lived shared cache.
 *
 * @param options - Table names and visibility scope for the requested snapshot.
 * @returns Cached or freshly resolved active organization snapshot.
 */
async function loadCachedActiveOrganizationSnapshot(options: {
    agentTable: string;
    folderTable: string;
    visibilityScope: AgentOrganizationVisibilityScope;
}): Promise<ResolvedAgentOrganizationSnapshot> {
    const cacheKey = createActiveOrganizationSnapshotCacheKey(options);
    const cachedSnapshot = readCachedActiveOrganizationSnapshot(cacheKey);
    if (cachedSnapshot) {
        return cachedSnapshot;
    }

    const snapshotPromise = loadResolvedOrganizationSnapshot({
        status: 'ACTIVE',
        agentTable: options.agentTable,
        folderTable: options.folderTable,
        visibilityScope: options.visibilityScope,
    });
    cachedActiveOrganizationSnapshotByKey.set(cacheKey, {
        loadedAt: Date.now(),
        snapshotPromise,
    });

    try {
        return await snapshotPromise;
    } catch (error) {
        if (cachedActiveOrganizationSnapshotByKey.get(cacheKey)?.snapshotPromise === snapshotPromise) {
            cachedActiveOrganizationSnapshotByKey.delete(cacheKey);
        }
        throw error;
    }
}

/**
 * Loads agents and folders for the organization views.
 *
 * @param options - Loader options for active or recycle bin data.
 * @returns Organization data for the requested status.
 */
export async function loadAgentOrganizationState(
    options: AgentOrganizationLoadOptions,
): Promise<AgentOrganizationLoadResult> {
    const currentUser = await getCurrentUser();
    const includePrivate = options.includePrivate === true;

    if (!currentUser && options.status === 'RECYCLE_BIN') {
        return { agents: [], folders: [], currentUser: null };
    }

    const [agentTable, folderTable] = await Promise.all([$getTableName('Agent'), $getTableName('AgentFolder')]);
    const visibilityScope: AgentOrganizationVisibilityScope = currentUser || includePrivate ? 'all' : 'public';
    const snapshot =
        options.status === 'ACTIVE'
            ? await loadCachedActiveOrganizationSnapshot({
                  agentTable,
                  folderTable,
                  visibilityScope,
              })
            : await loadResolvedOrganizationSnapshot({
                  status: options.status,
                  agentTable,
                  folderTable,
                  visibilityScope,
              });

    return {
        ...snapshot,
        currentUser: visibilityScope === 'all' ? currentUser : null,
    };
}
