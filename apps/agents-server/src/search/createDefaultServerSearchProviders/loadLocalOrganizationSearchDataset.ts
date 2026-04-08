import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { $provideAgentReferenceResolver } from '../../utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { getWellKnownAgentUrl } from '../../utils/getWellKnownAgentUrl';
import { resolveCurrentOrInternalServerOrigin } from '../../utils/resolveCurrentOrInternalServerOrigin';
import { resolveStoredAgentStates } from '../../utils/resolveStoredAgentState';

/**
 * Agent table row shape used by local organization search.
 *
 * @private function of createDefaultServerSearchProviders
 */
type AgentSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'id' | 'agentName' | 'permanentId' | 'agentSource' | 'folderId' | 'visibility'
> & {
    readonly resolvedAgentProfile: AgentBasicInformation;
    readonly resolvedAgentSource: string;
};

/**
 * Folder table row shape used by local organization search.
 *
 * @private function of createDefaultServerSearchProviders
 */
type AgentFolderSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'],
    'id' | 'name' | 'parentId'
>;

/**
 * Shared local organization dataset used by multiple providers.
 *
 * @private function of createDefaultServerSearchProviders
 */
export type LocalOrganizationSearchDataset = {
    agents: ReadonlyArray<AgentSearchRow>;
    folders: ReadonlyArray<AgentFolderSearchRow>;
    folderById: Map<number, AgentFolderSearchRow>;
};

/**
 * Loads active agents and folders and prepares lookups for search providers.
 *
 * @param options Include-private option for visibility filtering.
 * @returns Prepared searchable organization dataset.
 *
 * @private function of createDefaultServerSearchProviders
 */
export async function loadLocalOrganizationSearchDataset(options: {
    includePrivate: boolean;
    userId?: number;
}): Promise<LocalOrganizationSearchDataset> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentQuery = supabase
        .from(agentTable)
        .select('id, agentName, permanentId, agentSource, folderId, visibility')
        .is('deletedAt', null);

    if (!options.includePrivate) {
        agentQuery.eq('visibility', 'PUBLIC');
    }

    const folderQuery = supabase.from(folderTable).select('id, name, parentId').is('deletedAt', null);

    if (typeof options.userId === 'number') {
        (agentQuery as unknown as { eq(column: string, value: number): void }).eq('userId', options.userId);
        (folderQuery as unknown as { eq(column: string, value: number): void }).eq('userId', options.userId);
    }

    const [agentResult, folderResult] = await Promise.all([agentQuery, folderQuery]);

    if (agentResult.error) {
        throw new Error(`Failed to load searchable agents: ${agentResult.error.message}`);
    }
    if (folderResult.error) {
        throw new Error(`Failed to load searchable folders: ${folderResult.error.message}`);
    }

    const folders = (folderResult.data || []) as AgentFolderSearchRow[];
    const localServerUrl = await resolveCurrentOrInternalServerOrigin();
    const agentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgents = await resolveStoredAgentStates(
        (agentResult.data || []) as Array<Pick<AgentSearchRow, 'id' | 'agentName' | 'permanentId' | 'agentSource' | 'folderId' | 'visibility'>>,
        {
            localServerUrl,
            adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
            agentReferenceResolver,
        },
    );
    const agents = resolvedAgents.map((agent) => ({
        id: agent.id,
        agentName: agent.agentName,
        permanentId: agent.permanentId || null,
        agentSource: agent.agentSource,
        folderId: agent.folderId,
        visibility: agent.visibility,
        resolvedAgentProfile: agent.resolvedAgentProfile,
        resolvedAgentSource: agent.resolvedAgentSource,
    })) as AgentSearchRow[];
    const folderById = new Map<number, AgentFolderSearchRow>(folders.map((folder) => [folder.id, folder]));

    const visibleFolderIds = new Set<number>();
    if (!options.includePrivate) {
        for (const agent of agents) {
            let currentFolderId = agent.folderId;
            while (currentFolderId !== null) {
                const folder = folderById.get(currentFolderId);
                if (!folder) {
                    break;
                }
                visibleFolderIds.add(folder.id);
                currentFolderId = folder.parentId;
            }
        }
    }

    const filteredFolders = options.includePrivate
        ? folders
        : folders.filter((folder) => visibleFolderIds.has(folder.id));

    return {
        agents,
        folders: filteredFolders,
        folderById: new Map<number, AgentFolderSearchRow>(filteredFolders.map((folder) => [folder.id, folder])),
    };
}
