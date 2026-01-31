'use server';

import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import { buildFolderTree, collectAncestorFolderIds } from './folderTree';

/**
 * Restores a deleted agent and ensures its parent folders are restored.
 *
 * @param agentIdentifier - Agent name or permanent id to restore.
 */
export async function restoreAgentAndFolders(agentIdentifier: string): Promise<void> {
    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentPermanentId(agentIdentifier);
    await collection.restoreAgent(agentId);

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentResult = await supabase
        .from(agentTable)
        .select('folderId')
        .or(`agentName.eq.${agentIdentifier},permanentId.eq.${agentIdentifier}`)
        .single();

    if (agentResult.error || !agentResult.data?.folderId) {
        return;
    }

    const folderResult = await supabase.from(folderTable).select('id, parentId, deletedAt');
    if (folderResult.error) {
        return;
    }

    const { folderById } = buildFolderTree(folderResult.data || []);
    const ancestorIds = collectAncestorFolderIds(agentResult.data.folderId, folderById);

    await supabase.from(folderTable).update({ deletedAt: null }).in('id', ancestorIds).not('deletedAt', 'is', null);
}
