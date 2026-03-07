import { buildFolderPath, getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { loadLocalOrganizationSearchDataset } from './loadLocalOrganizationSearchDataset';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Creates provider for agent folders.
 *
 * @returns Configured folder search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createFoldersSearchProvider(): ServerSearchProvider {
    return {
        id: 'folders',
        label: 'Folders',
        async search(context) {
            const dataset = await loadLocalOrganizationSearchDataset({ includePrivate: Boolean(context.currentUser) });
            const results: ServerSearchResultItem[] = [];

            for (const folder of dataset.folders) {
                const pathSegments = getFolderPathSegments(folder.id, dataset.folderById);
                const folderPathNames = pathSegments.map((segment) => segment.name);
                const folderPathLabel = folderPathNames.join(' / ');
                const match = createServerSearchMatcher(context.query, [
                    { text: `${folder.name}\n${folderPathLabel}`, snippetText: folderPathLabel, weight: 2.5 },
                ]);

                if (!match) {
                    continue;
                }

                const folderParam = buildFolderPath(folderPathNames);
                results.push({
                    id: `folder-${folder.id}`,
                    providerId: 'folders',
                    group: 'Folders',
                    type: 'folder',
                    icon: 'folder',
                    title: folderPathLabel || folder.name,
                    snippet: match.snippet,
                    href: `/agents?folder=${folderParam}`,
                    score: match.score + 12,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
