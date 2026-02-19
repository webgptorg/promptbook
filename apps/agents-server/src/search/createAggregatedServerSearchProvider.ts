import type { ServerSearchProvider, ServerSearchProviderContext } from './ServerSearchProvider';
import type { ServerSearchResultItem } from './ServerSearchResultItem';

/**
 * Maximum number of rows returned by the aggregated provider.
 */
const DEFAULT_AGGREGATED_RESULT_LIMIT = 40;

/**
 * Creates an aggregated provider that executes all domain providers in parallel.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function createAggregatedServerSearchProvider(
    providers: ReadonlyArray<ServerSearchProvider>,
): ServerSearchProvider {
    return {
        id: 'aggregated',
        label: 'Aggregated Search',
        async search(context: ServerSearchProviderContext): Promise<ReadonlyArray<ServerSearchResultItem>> {
            const providerResults = await Promise.all(
                providers.map(async (provider) => {
                    try {
                        return await provider.search(context);
                    } catch (error) {
                        console.error(`[search] Provider "${provider.id}" failed:`, error);
                        return [];
                    }
                }),
            );

            const deduplicatedByTarget = new Map<string, ServerSearchResultItem>();
            for (const providerItems of providerResults) {
                for (const item of providerItems) {
                    const dedupeKey = `${item.href}::${item.type}`;
                    const previous = deduplicatedByTarget.get(dedupeKey);
                    if (!previous || previous.score < item.score) {
                        deduplicatedByTarget.set(dedupeKey, item);
                    }
                }
            }

            return Array.from(deduplicatedByTarget.values())
                .sort((left, right) => {
                    if (left.score !== right.score) {
                        return right.score - left.score;
                    }
                    return left.title.localeCompare(right.title);
                })
                .slice(0, DEFAULT_AGGREGATED_RESULT_LIMIT);
        },
    };
}
