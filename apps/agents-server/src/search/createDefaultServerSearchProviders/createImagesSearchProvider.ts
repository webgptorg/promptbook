import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Image table row shape used by images provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type ImageSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Image']['Row'],
    'id' | 'createdAt' | 'filename' | 'prompt' | 'purpose'
>;

/**
 * Creates provider for generated images (admin-only).
 *
 * @returns Configured images search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createImagesSearchProvider(): ServerSearchProvider {
    return {
        id: 'images',
        label: 'Images',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Image'))
                .select('id, createdAt, filename, prompt, purpose')
                .order('createdAt', { ascending: false })
                .limit(defaultServerSearchProviderConfig.adminLogLimit);

            if (error) {
                console.error('[search] Failed to load images:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const image of (data || []) as ImageSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [image.filename, image.prompt, image.purpose || ''].join('\n'),
                        snippetText: image.prompt,
                        weight: 1.7,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `image-${image.id}`,
                    providerId: 'images',
                    group: 'Images',
                    type: 'image',
                    icon: 'image',
                    title: image.filename,
                    snippet: match.snippet,
                    href: '/admin/images',
                    score: match.score + 7,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
