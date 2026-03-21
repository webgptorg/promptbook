import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Minimal agent row used to build public profile SEO records.
 */
type PublicAgentSeoRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'agentName' | 'permanentId' | 'createdAt' | 'updatedAt'
>;

/**
 * Default number of agent URLs emitted in one sitemap page.
 */
export const DEFAULT_SITEMAP_PAGE_SIZE = 500;

/**
 * Canonical SEO record for one publicly indexable agent profile page.
 */
export type PublicAgentProfileSeoRecord = {
    /**
     * Human-readable agent name.
     */
    readonly agentName: string;

    /**
     * Canonical route identifier (`permanentId` when present, otherwise `agentName`).
     */
    readonly canonicalAgentId: string;

    /**
     * Last update timestamp for sitemap `lastmod`.
     */
    readonly lastModifiedAt: string;
};

/**
 * Loads all publicly indexable agent profile records from the active server schema.
 *
 * Note: Only non-deleted `PUBLIC` agents are returned.
 *
 * @returns Canonical SEO records for public agent profiles.
 */
export async function getPublicAgentProfileSeoRecords(): Promise<ReadonlyArray<PublicAgentProfileSeoRecord>> {
    const count = await countPublicAgentProfileSeoRecords();
    if (count === 0) {
        return [];
    }

    return getPublicAgentProfileSeoRecordsPage({ page: 1, pageSize: count });
}

/**
 * Counts publicly indexable agent profile records.
 *
 * Note: Only non-deleted `PUBLIC` agents are counted.
 *
 * @returns Total number of public agent profile pages.
 */
export async function countPublicAgentProfileSeoRecords(): Promise<number> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');

    const result = await supabase
        .from(agentTable)
        .select('agentName', { count: 'exact', head: true })
        .eq('visibility', 'PUBLIC')
        .is('deletedAt', null);

    if (result.error) {
        throw new Error(`Failed to load public agents for SEO: ${result.error.message}`);
    }

    return result.count || 0;
}

/**
 * Loads one page of publicly indexable agent profile records.
 *
 * @param options - Paging options.
 * @returns One page of canonical SEO records for public agent profiles.
 */
export async function getPublicAgentProfileSeoRecordsPage(options: {
    page: number;
    pageSize?: number;
}): Promise<ReadonlyArray<PublicAgentProfileSeoRecord>> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const page = Number.isFinite(options.page) && options.page > 0 ? Math.floor(options.page) : 1;
    const pageSize =
        Number.isFinite(options.pageSize) && (options.pageSize || 0) > 0
            ? Math.floor(options.pageSize || DEFAULT_SITEMAP_PAGE_SIZE)
            : DEFAULT_SITEMAP_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const result = await supabase
        .from(agentTable)
        .select('agentName, permanentId, createdAt, updatedAt')
        .eq('visibility', 'PUBLIC')
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .order('createdAt', { ascending: false })
        .range(from, to);

    if (result.error) {
        throw new Error(`Failed to load public agents for SEO: ${result.error.message}`);
    }

    return (result.data || []).map((agentRow) => toPublicAgentProfileSeoRecord(agentRow as PublicAgentSeoRow));
}

/**
 * Creates one canonical SEO record from a database row.
 *
 * @param agentRow - Raw public agent row.
 * @returns Canonical SEO record.
 */
function toPublicAgentProfileSeoRecord(agentRow: PublicAgentSeoRow): PublicAgentProfileSeoRecord {
    const canonicalAgentId = agentRow.permanentId || agentRow.agentName;
    const lastModifiedAt = agentRow.updatedAt || agentRow.createdAt;

    return {
        agentName: agentRow.agentName,
        canonicalAgentId,
        lastModifiedAt,
    };
}
