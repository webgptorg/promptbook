import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * File table row shape used by files provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type FileSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['File']['Row'],
    'id' | 'createdAt' | 'fileName' | 'fileType' | 'purpose' | 'status' | 'shortUrl' | 'storageUrl'
>;

/**
 * Creates provider for uploaded files (admin-only).
 *
 * @returns Configured files search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createFilesSearchProvider(): ServerSearchProvider {
    return {
        id: 'files',
        label: 'Files',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('File'))
                .select('id, createdAt, fileName, fileType, purpose, status, shortUrl, storageUrl')
                .order('createdAt', { ascending: false })
                .limit(defaultServerSearchProviderConfig.adminLogLimit);

            if (error) {
                console.error('[search] Failed to load files:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const file of (data || []) as FileSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [
                            file.fileName,
                            file.fileType,
                            file.purpose,
                            file.status,
                            file.shortUrl || '',
                            file.storageUrl || '',
                        ].join('\n'),
                        snippetText: `${file.fileType} ${file.purpose} ${file.status}`,
                        weight: 1.7,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `file-${file.id}`,
                    providerId: 'files',
                    group: 'Files',
                    type: 'file',
                    icon: 'file',
                    title: file.fileName,
                    snippet: match.snippet,
                    href: '/admin/files',
                    score: match.score + 7,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
