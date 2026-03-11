import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { createServerSearchMatcher } from '../../search/createServerSearchMatcher';
import { loadLocalOrganizationSearchDataset } from '../../search/createDefaultServerSearchProviders/loadLocalOrganizationSearchDataset';
import { stringifyJsonForSearch } from '../../search/createDefaultServerSearchProviders/stringifyJsonForSearch';
import { toAgentProfile } from '../../search/createDefaultServerSearchProviders/toAgentProfile';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { OwnedAgentRow } from '../agentOwnership';
import { z } from 'zod';
import { ManagementAgentListQuerySchema } from './managementApiSchemas';

/**
 * Parsed query params for the management agent list endpoint.
 */
type ManagementAgentListQuery = z.infer<typeof ManagementAgentListQuerySchema>;

/**
 * Flat agent summary returned by the owner-aware search helper before pagination.
 */
export type ManagementAgentListItem = {
    /**
     * Persisted agent row.
     */
    row: OwnedAgentRow;
    /**
     * Parsed agent profile.
     */
    profile: Partial<AgentBasicInformation>;
    /**
     * Relevance score computed using the shared UI search matcher.
     */
    relevanceScore: number;
};

/**
 * Builds public links for one agent.
 *
 * @param baseUrl - Public base URL of the current instance.
 * @param identifier - Stable routing identifier.
 * @returns Public URLs for the agent.
 */
export function createManagementAgentLinks(baseUrl: URL, identifier: string) {
    return {
        profileUrl: new URL(`/agents/${encodeURIComponent(identifier)}`, baseUrl).href,
        chatUrl: new URL(`/agents/${encodeURIComponent(identifier)}/chat`, baseUrl).href,
        integrationUrl: new URL(`/agents/${encodeURIComponent(identifier)}/integration`, baseUrl).href,
    };
}

/**
 * Maps one persisted agent row into the management API summary shape.
 *
 * @param row - Persisted agent row.
 * @param baseUrl - Public base URL of the current instance.
 * @returns JSON-serializable summary payload.
 */
export function mapOwnedAgentRowToManagementSummary(row: OwnedAgentRow, baseUrl: URL) {
    const profile = toAgentProfile(row.agentProfile);
    const identifier = row.permanentId || row.agentName;

    return {
        id: identifier,
        agentName: row.agentName,
        permanentId: identifier,
        displayName: profile.meta?.fullname || row.agentName,
        description: profile.meta?.description || profile.personaDescription || null,
        visibility: row.visibility,
        folderId: row.folderId ?? null,
        sortOrder: row.sortOrder ?? 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? null,
        links: createManagementAgentLinks(baseUrl, identifier),
    };
}

/**
 * Maps one persisted agent row into the management API detail shape.
 *
 * @param row - Persisted agent row.
 * @param baseUrl - Public base URL of the current instance.
 * @returns JSON-serializable detail payload.
 */
export function mapOwnedAgentRowToManagementDetail(row: OwnedAgentRow, baseUrl: URL) {
    return {
        ...mapOwnedAgentRowToManagementSummary(row, baseUrl),
        source: row.agentSource,
        profile: toAgentProfile(row.agentProfile),
    };
}

/**
 * Computes the next sort order for one user-owned folder position.
 *
 * @param userId - Owner identifier.
 * @param folderId - Target folder identifier or `null` for root.
 * @returns Sort order appended after the current sibling set.
 */
export async function getNextOwnedAgentSortOrder(userId: number, folderId: number | null): Promise<number> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    let query = supabase
        .from(tableName)
        .select('sortOrder')
        .eq('userId', userId as never)
        .is('deletedAt', null)
        .order('sortOrder', { ascending: false })
        .limit(1);

    query =
        folderId === null
            ? query.is('folderId', null)
            : query.eq('folderId', folderId as never);

    const result = await query.maybeSingle();
    if (result.error) {
        throw new Error(`Failed to compute next agent sort order: ${result.error.message}`);
    }

    return ((result.data as { sortOrder?: number } | null)?.sortOrder ?? 0) + 1;
}

/**
 * Searches agents owned by the provided user using the same matcher used in the UI search.
 *
 * @param userId - Owner identifier.
 * @param query - Parsed list query parameters.
 * @returns Owner-scoped agents after search filtering and sorting.
 */
export async function searchOwnedAgents(
    userId: number,
    query: ManagementAgentListQuery,
): Promise<ReadonlyArray<ManagementAgentListItem>> {
    const dataset = await loadLocalOrganizationSearchDataset({
        includePrivate: true,
        userId,
    });

    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    const rowsResult = await supabase
        .from(tableName)
        .select(
            'id, agentName, createdAt, updatedAt, permanentId, agentHash, agentSource, agentProfile, promptbookEngineVersion, folderId, sortOrder, deletedAt, visibility, userId',
        )
        .eq('userId', userId as never)
        .is('deletedAt', null);

    if (rowsResult.error) {
        throw new Error(`Failed to load owned agents: ${rowsResult.error.message}`);
    }

    const rowByIdentifier = new Map<string, OwnedAgentRow>();
    for (const row of (rowsResult.data || []) as unknown as OwnedAgentRow[]) {
        rowByIdentifier.set(row.permanentId || row.agentName, row);
    }

    const listItems: ManagementAgentListItem[] = [];
    for (const agent of dataset.agents) {
        const row = rowByIdentifier.get(agent.permanentId || agent.agentName);
        if (!row) {
            continue;
        }

        const profile = toAgentProfile(agent.agentProfile);
        const searchText = [
            row.agentName,
            profile.meta?.fullname || '',
            profile.meta?.description || '',
            profile.personaDescription || '',
            stringifyJsonForSearch(profile.meta || {}),
            row.agentSource || '',
        ].join('\n');

        const match = query.q
            ? createServerSearchMatcher(query.q, [
                  {
                      text: searchText,
                      snippetText: profile.meta?.description || profile.personaDescription || searchText,
                      weight: 3,
                  },
                  {
                      text: row.agentSource || '',
                      snippetText: row.agentSource || '',
                      weight: 2.1,
                  },
              ])
            : null;

        if (query.q && !match) {
            continue;
        }

        listItems.push({
            row,
            profile,
            relevanceScore: match?.score ?? 0,
        });
    }

    return sortManagementAgentListItems(listItems, query.sort);
}

/**
 * Sorts already-filtered agent list items according to the requested sort mode.
 *
 * @param items - Filtered list items.
 * @param sort - Requested sort mode.
 * @returns Sorted list items.
 */
function sortManagementAgentListItems(
    items: ReadonlyArray<ManagementAgentListItem>,
    sort: ManagementAgentListQuery['sort'],
): ReadonlyArray<ManagementAgentListItem> {
    return [...items].sort((left, right) => {
        switch (sort) {
            case 'relevance:desc':
                return right.relevanceScore - left.relevanceScore;
            case 'createdAt:asc':
                return left.row.createdAt.localeCompare(right.row.createdAt);
            case 'createdAt:desc':
                return right.row.createdAt.localeCompare(left.row.createdAt);
            case 'updatedAt:asc':
                return (left.row.updatedAt || left.row.createdAt).localeCompare(right.row.updatedAt || right.row.createdAt);
            case 'updatedAt:desc':
                return (right.row.updatedAt || right.row.createdAt).localeCompare(left.row.updatedAt || left.row.createdAt);
            case 'name:asc':
                return (left.profile.meta?.fullname || left.row.agentName).localeCompare(
                    right.profile.meta?.fullname || right.row.agentName,
                );
            case 'name:desc':
                return (right.profile.meta?.fullname || right.row.agentName).localeCompare(
                    left.profile.meta?.fullname || left.row.agentName,
                );
            default:
                return 0;
        }
    });
}
