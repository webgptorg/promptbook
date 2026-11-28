import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Creates provider for commitment documentation pages.
 *
 * @returns Configured documentation search provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
export function createDocumentationSearchProvider(): ServerSearchProvider {
    return {
        id: 'documentation',
        label: 'Documentation',
        async search(context) {
            const groupedCommitments = getVisibleCommitmentDefinitions();
            const results: ServerSearchResultItem[] = [];

            const overviewMatch = createServerSearchMatcher(context.query, [
                {
                    text: 'documentation docs commitments overview reference',
                    snippetText: 'Browse all commitment documentation pages and API reference.',
                    weight: 1.4,
                },
            ]);
            if (overviewMatch) {
                results.push({
                    id: 'docs-overview',
                    providerId: 'documentation',
                    group: 'Documentation',
                    type: 'docs-overview',
                    icon: 'documentation',
                    title: 'Documentation overview',
                    snippet: overviewMatch.snippet || 'Browse all commitment documentation pages and API reference.',
                    href: '/docs',
                    score: overviewMatch.score + 4,
                });
            }

            for (const commitmentGroup of groupedCommitments) {
                const commitmentTitle = [commitmentGroup.primary.type, ...commitmentGroup.aliases].join(' / ');
                const searchText = [
                    commitmentTitle,
                    commitmentGroup.primary.description || '',
                ].join('\n');
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: searchText,
                        snippetText: searchText,
                        weight: 2.4,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `docs-${commitmentGroup.primary.type}`,
                    providerId: 'documentation',
                    group: 'Documentation',
                    type: 'commitment-doc',
                    icon: 'documentation',
                    title: commitmentTitle,
                    snippet: match.snippet,
                    href: `/docs/${encodeURIComponent(commitmentGroup.primary.type)}`,
                    score: match.score + 14,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
