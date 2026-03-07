import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Metadata table row shape used by metadata provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type MetadataSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Metadata']['Row'],
    'id' | 'key' | 'value' | 'note'
>;

/**
 * Creates provider for metadata entries (admin-only).
 *
 * @returns Configured metadata search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createMetadataSearchProvider(): ServerSearchProvider {
    return {
        id: 'metadata',
        label: 'Metadata',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Metadata'))
                .select('id, key, value, note')
                .order('key');

            if (error) {
                console.error('[search] Failed to load metadata rows:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const row of (data || []) as MetadataSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [row.key, row.value, row.note || ''].join('\n'),
                        snippetText: [row.value, row.note || ''].join('\n'),
                        weight: 2.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `metadata-${row.id}`,
                    providerId: 'metadata',
                    group: 'Metadata',
                    type: 'metadata',
                    icon: 'metadata',
                    title: row.key,
                    snippet: match.snippet,
                    href: '/admin/metadata',
                    score: match.score + 18,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
