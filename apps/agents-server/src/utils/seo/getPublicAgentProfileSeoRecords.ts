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
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');

    const result = await supabase
        .from(agentTable)
        .select('agentName, permanentId, createdAt, updatedAt')
        .eq('visibility', 'PUBLIC')
        .is('deletedAt', null);

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
