'use server';

import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { getCurrentUser } from '../getCurrentUser';
import { buildFolderTree, collectAncestorFolderIds } from './folderTree';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationLoadOptions,
    AgentOrganizationLoadResult,
} from './types';

type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];
type AgentFolderRow = AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'];

/**
 * Converts a database agent row into the organization payload.
 *
 * @param row - Raw agent row from Supabase.
 * @returns Agent payload enriched with organization metadata.
 */
function mapAgentRowToOrganizationAgent(
    row: Pick<AgentRow, 'agentName' | 'agentProfile' | 'permanentId' | 'visibility' | 'folderId' | 'sortOrder'>,
): AgentOrganizationAgent {
    const profile = row.agentProfile as AgentBasicInformation;

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

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentQuery = supabase
        .from(agentTable)
        .select('agentName, agentProfile, permanentId, visibility, folderId, sortOrder, deletedAt');
    const folderQuery = supabase.from(folderTable).select('id, name, parentId, sortOrder, icon, color, deletedAt');

    if (options.status === 'RECYCLE_BIN') {
        agentQuery.not('deletedAt', 'is', null);
        folderQuery.not('deletedAt', 'is', null);
    } else {
        agentQuery.is('deletedAt', null);
        folderQuery.is('deletedAt', null);
    }

    const [agentResult, folderResult] = await Promise.all([agentQuery, folderQuery]);

    if (agentResult.error) {
        throw new Error(`Failed to load agents: ${agentResult.error.message}`);
    }

    if (folderResult.error) {
        throw new Error(`Failed to load folders: ${folderResult.error.message}`);
    }

    const agents = (agentResult.data || []).map(mapAgentRowToOrganizationAgent);
    const folders = (folderResult.data || []).map(mapFolderRowToOrganizationFolder);

    if (currentUser || includePrivate) {
        return { agents, folders, currentUser };
    }

    const publicAgents = agents.filter((agent) => agent.visibility === 'PUBLIC');
    const { folderById } = buildFolderTree(folders);
    const visibleFolderIds = new Set<number>();

    for (const agent of publicAgents) {
        if (agent.folderId === null) {
            continue;
        }
        const ancestors = collectAncestorFolderIds(agent.folderId, folderById);
        for (const ancestorId of ancestors) {
            visibleFolderIds.add(ancestorId);
        }
    }

    const visibleFolders = folders.filter((folder) => visibleFolderIds.has(folder.id));

    return { agents: publicAgents, folders: visibleFolders, currentUser: null };
}
