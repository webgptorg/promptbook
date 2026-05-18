import { $getTableName } from '@/src/database/$getTableName';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    parseBookScopedAgentIdentifier,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { cache } from 'react';
import type { AgentsServerDatabase } from '../../../database/schema';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { buildAgentFolderContext, type AgentFolderContext } from '../../../utils/agentOrganization/agentFolderContext';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';
import { resolveAgentRouteTarget } from '@/src/utils/agentRouting/resolveAgentRouteTarget';
import { notFound, redirect } from 'next/navigation';

/**
 * Database agent row shape used for folder lookups.
 */
type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];

/**
 * Database folder row shape used for folder navigation.
 */
type AgentFolderRow = AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'];

/**
 * Collection of agent actions.
 */
export const AGENT_ACTIONS = ['Emails', 'Web chat', 'Read documents', 'Browser', 'WhatsApp', '<Coding/>'];

/**
 * Gets agent name.
 */
export async function getAgentName(params: Promise<{ agentName: string }>) {
    const { agentName } = await params;
    return decodeURIComponent(agentName);
}

/**
 * Resolves a decoded route agent identifier into the canonical local permanent id.
 *
 * Remote and pseudo-agent route targets are redirected to their canonical URLs, while
 * unknown agents are handled as a 404.
 *
 * @param agentIdentifier - Decoded route agent identifier.
 * @returns Canonical local agent permanent id.
 */
export async function resolveCanonicalLocalAgentId(agentIdentifier: string): Promise<string> {
    const routeTarget = await resolveAgentRouteTarget(agentIdentifier);

    if (routeTarget === null) {
        notFound();
    }

    if (routeTarget.kind === 'remote') {
        redirect(routeTarget.url);
    }

    if (routeTarget.kind === 'pseudo') {
        redirect(routeTarget.canonicalUrl);
    }

    return routeTarget.canonicalAgentId;
}

/**
 * Ensures a route is rendered only on its canonical ID-based path.
 *
 * @param agentIdentifier - Decoded route agent identifier.
 * @param buildCanonicalPath - Builds the canonical path for the current subroute.
 * @returns Canonical local agent permanent id.
 */
export async function enforceCanonicalLocalAgentId(
    agentIdentifier: string,
    buildCanonicalPath: (canonicalAgentId: string) => string,
): Promise<string> {
    const canonicalAgentId = await resolveCanonicalLocalAgentId(agentIdentifier);

    if (agentIdentifier !== canonicalAgentId) {
        redirect(buildCanonicalPath(canonicalAgentId));
    }

    return canonicalAgentId;
}

/**
 * Resolves the full agent profile for the current request.
 *
 * @param agentName - Agent identifier coming from the route.
 * @returns Resolved agent profile with visibility.
 */
const getCachedAgentProfile = cache(async (agentName: string) => {
    const collection = await $provideAgentCollectionForServer();
    const { publicUrl } = await $provideServer();
    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl: publicUrl.href,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentProfile = resolvedAgentContext.resolvedAgentProfile;

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
});

/**
 * Resolves the full agent profile for the current request.
 *
 * @param agentName - Agent identifier coming from the route.
 * @returns Resolved agent profile with visibility.
 */
export async function getAgentProfile(agentName: string) {
    return getCachedAgentProfile(agentName);
}

/**
 * Checks whether the requested agent is soft-deleted.
 *
 * @param agentName - Agent identifier coming from the route.
 * @returns Whether the resolved agent row is deleted.
 */
const getCachedIsAgentDeleted = cache(async (agentName: string): Promise<boolean> => {
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

    return result.data[0]!.deletedAt != null;
});

/**
 * Checks whether the requested agent is soft-deleted.
 *
 * @param agentName - Agent identifier coming from the route.
 * @returns Whether the resolved agent row is deleted.
 */
export async function isAgentDeleted(agentName: string): Promise<boolean> {
    return getCachedIsAgentDeleted(agentName);
}

/**
 * Resolves the folder navigation context for the agent profile menu.
 *
 * @param agentName - Agent name or permanent id to look up.
 * @returns Folder context for the agent or null when unavailable.
 */
const getCachedAgentFolderContext = cache(async (agentName: string): Promise<AgentFolderContext | null> => {
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
    if (agentRow.visibility !== 'PUBLIC') {
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
});

/**
 * Resolves the folder navigation context for the agent profile menu.
 *
 * @param agentName - Agent name or permanent id to look up.
 * @returns Folder context for the agent or null when unavailable.
 */
export async function getAgentFolderContext(agentName: string): Promise<AgentFolderContext | null> {
    return getCachedAgentFolderContext(agentName);
}

/**
 * Parses boolean query flags used in agent chat routes.
 *
 * @param value - Raw query parameter value.
 * @returns `true` when the parameter represents a truthy value.
 */
export function parseBooleanFlag(value?: string | null): boolean {
    if (!value) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

// TODO: Split to multiple files, refactor
