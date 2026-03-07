import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Creates provider for commitment documentation pages.
 *
 * @returns Configured documentation search provider.
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
                const commitmentLabel = commitmentGroup.primary.type;
                const aliases = commitmentGroup.aliases.join(' / ');
                const searchText = [
                    commitmentLabel,
                    aliases,
                    commitmentGroup.primary.description || '',
                ].join('\n');
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: searchText,
                        snippetText: commitmentGroup.primary.description || aliases || commitmentLabel,
                        weight: 2.4,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `docs-${commitmentLabel}`,
                    providerId: 'documentation',
                    group: 'Documentation',
                    type: 'commitment-doc',
                    icon: 'documentation',
                    title: commitmentLabel,
                    snippet: match.snippet,
                    href: `/docs/${encodeURIComponent(commitmentLabel)}`,
                    score: match.score + 14,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
