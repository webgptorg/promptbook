import { $getTableName } from '@/src/database/$getTableName';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { parseAgentSource } from '@promptbook-local/core';
import type { AgentsServerDatabase } from '../../../database/schema';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { buildAgentFolderContext, type AgentFolderContext } from '../../../utils/agentOrganization/agentFolderContext';
import { getMetadata } from '@/database/getMetadata';

/**
 * Database agent row shape used for folder lookups.
 */
type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];

/**
 * Database folder row shape used for folder navigation.
 */
type AgentFolderRow = AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'];

export const AGENT_ACTIONS = ['Emails', 'Web chat', 'Read documents', 'Browser', 'WhatsApp', '<Coding/>'];

export async function getAgentName(params: Promise<{ agentName: string }>) {
    const { agentName } = await params;
    return decodeURIComponent(agentName);
}

export async function getAgentProfile(agentName: string) {
    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentPermanentId(agentName);
    const agentSource = await collection.getAgentSource(agentId);
    const agentProfile = parseAgentSource(agentSource);

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const agentResult = await supabase
        .from(agentTable)
        .select('visibility')
        .or(`agentName.eq.${agentName},permanentId.eq.${agentName}`)
        .limit(1)
        .single();

    if (agentResult.error || !agentResult.data) {
        throw new Error(`Agent not found: ${agentName}`);
    }

    return { ...agentProfile, visibility: agentResult.data.visibility };
}

export async function isAgentDeleted(agentName: string): Promise<boolean> {
    const supabase = $provideSupabaseForServer();

    const result = await supabase
        .from(await $getTableName(`Agent`))
        .select('deletedAt')
        .eq('agentName', agentName)
        .single();

    if (result.error || !result.data) {
        return false; // If agent doesn't exist or error, consider not deleted
    }

    return result.data.deletedAt !== null;
}

/**
 * Resolves the folder navigation context for the agent profile menu.
 *
 * @param agentName - Agent name or permanent id to look up.
 * @param isAdmin - Whether the current user has admin access.
 * @returns Folder context for the agent or null when unavailable.
 */
export async function getAgentFolderContext(
    agentName: string,
    isAdmin: boolean,
): Promise<AgentFolderContext | null> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentResult = await supabase
        .from(agentTable)
        .select('folderId, visibility, deletedAt')
        .or(`agentName.eq.${agentName},permanentId.eq.${agentName}`)
        .limit(1);

    if (agentResult.error || !agentResult.data || agentResult.data.length === 0) {
        return null;
    }

    const agentRow = agentResult.data[0] as Pick<AgentRow, 'folderId' | 'visibility'>;
    if (!isAdmin && agentRow.visibility !== 'PUBLIC') {
        return null;
    }

    const folderId = agentRow.folderId ?? null;
    if (folderId === null) {
        return null;
    }

    const folderResult = await supabase
        .from(folderTable)
        .select('id, name, parentId, deletedAt')
        .is('deletedAt', null);

    if (folderResult.error || !folderResult.data) {
        return null;
    }

    const folderById = new Map<number, AgentFolderRow>();
    for (const folder of folderResult.data) {
        folderById.set(folder.id, folder as AgentFolderRow);
    }

    return buildAgentFolderContext(folderId, folderById);
}

/**
 * Reads the global defaults for sounds and vibration from the metadata table.
 *
 * @returns Current default state for sounds and vibration.
 */
export async function getDefaultSoundSettings() {
    const [soundsMeta, vibrationMeta] = await Promise.all([
        getMetadata('DEFAULT_IS_SOUNDS_ON'),
        getMetadata('DEFAULT_IS_VIBRATION_ON'),
    ]);

    return {
        defaultIsSoundsOn: (soundsMeta || 'false') === 'true',
        defaultIsVibrationOn: (vibrationMeta || 'true') === 'true',
    };
}

/**
 * TODO: Split to multiple files, refactor
 */
