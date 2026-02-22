import { $getTableName } from '@/src/database/$getTableName';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
    resolveBookScopedAgentContext,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveAgentProfileWithInheritance } from '@/src/utils/resolveAgentProfileWithInheritance';
import type { AgentsServerDatabase } from '../../../database/schema';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { buildAgentFolderContext, type AgentFolderContext } from '../../../utils/agentOrganization/agentFolderContext';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';

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
    const { publicUrl } = await $provideServer();
    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveBookScopedAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl: publicUrl.href,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentSource = resolvedAgentContext.resolvedAgentSource;
    const agentReferenceResolver = resolvedAgentContext.scopedAgentReferenceResolver;
    const agentProfile = await resolveAgentProfileWithInheritance(agentSource, {
        adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
        agentReferenceResolver,
    });

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const agentResult = await supabase
        .from(agentTable)
        .select('visibility')
        .or(buildAgentNameOrIdFilter(resolvedAgentContext.parentAgentPermanentId))
        .limit(1)
        .single();

    if (agentResult.error || !agentResult.data) {
        throw new Error(`Agent not found: ${agentName}`);
    }

    return { ...agentProfile, visibility: agentResult.data.visibility };
}

export async function isAgentDeleted(agentName: string): Promise<boolean> {
    const supabase = $provideSupabaseForServer();
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const targetAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

    const result = await supabase
        .from(await $getTableName(`Agent`))
        .select('deletedAt')
        .or(buildAgentNameOrIdFilter(targetAgentIdentifier))
        .limit(1);

    if (result.error || !result.data || result.data.length === 0) {
        return false; // If agent doesn't exist or error, consider not deleted
    }

    return result.data[0]!.deletedAt !== null;
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
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const targetAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentResult = await supabase
        .from(agentTable)
        .select('folderId, visibility, deletedAt')
        .or(buildAgentNameOrIdFilter(targetAgentIdentifier))
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
 * TODO: Split to multiple files, refactor
 */
