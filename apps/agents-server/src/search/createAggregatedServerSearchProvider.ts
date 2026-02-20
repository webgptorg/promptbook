import type { ServerSearchProvider, ServerSearchProviderContext } from './ServerSearchProvider';
import type { ServerSearchResultItem } from './ServerSearchResultItem';

/**
 * Default number of rows returned by the aggregated provider when no limit is specified.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const DEFAULT_AGGREGATED_RESULT_LIMIT = 40;

/**
 * Upper cap for paged slices so the aggregated helper never returns more than what the API allows.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const MAX_AGGREGATED_RESULT_LIMIT = 200;

/**
 * Options that control offset, paging, and type-based filtering for the aggregated search helper.
 *
 * @private Internal type for `apps/agents-server`.
 */
export type AggregatedServerSearchOptions = {
    /**
     * Number of records to skip before slicing.
     */
    readonly offset?: number;

    /**
     * Maximum number of rows requested for the current page.
     */
    readonly limit?: number;

    /**
     * Optional result types used to filter the sorted list before paging.
     */
    readonly typeFilters?: ReadonlyArray<string>;
};

/**
 * Executes every search provider, deduplicates the merged items, and returns paged results plus a total count.
 *
 * @private Internal helper for `apps/agents-server`.
 */
export async function runAggregatedServerSearch(
    providers: ReadonlyArray<ServerSearchProvider>,
    context: ServerSearchProviderContext,
    options: AggregatedServerSearchOptions = {},
): Promise<{ items: ReadonlyArray<ServerSearchResultItem>; totalCount: number }> {
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

    const filtered = Array.from(deduplicatedByTarget.values()).sort((left, right) => {
        if (left.score !== right.score) {
            return right.score - left.score;
        }
        return left.title.localeCompare(right.title);
    });

    const activeFilters = new Set((options.typeFilters || []).filter(Boolean));
    const filteredByType =
        activeFilters.size === 0 ? filtered : filtered.filter((item) => activeFilters.has(item.type));

    const totalCount = filteredByType.length;
    const rawOffset = Math.max(0, Math.floor(options.offset ?? 0));
    const offset = Math.min(totalCount, rawOffset);
    const rawLimit = Math.max(1, Math.ceil(options.limit ?? DEFAULT_AGGREGATED_RESULT_LIMIT));
    const limit = Math.min(MAX_AGGREGATED_RESULT_LIMIT, rawLimit);
    const paginated = filteredByType.slice(offset, offset + limit);

    return {
        items: paginated,
        totalCount,
    };
}

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
            const { items } = await runAggregatedServerSearch(providers, context, {
                limit: DEFAULT_AGGREGATED_RESULT_LIMIT,
                offset: 0,
            });
            return items;
        },
    };
}
