import { NextRequest, NextResponse } from 'next/server';
import { runAggregatedServerSearch } from '@/src/search/createAggregatedServerSearchProvider';
import { createDefaultServerSearchProviders } from '@/src/search/createDefaultServerSearchProviders';
import type { ServerSearchResponse } from '@/src/search/ServerSearchResultItem';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Forces dynamic execution because results depend on query + auth/session state.
 */
export const dynamic = 'force-dynamic';

/**
 * Minimum number of characters required to execute full search.
 */
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Default total result limit.
 */
const DEFAULT_RESULT_LIMIT = 36;

/**
 * Maximum total result limit accepted from query params.
 */
const MAX_RESULT_LIMIT = 80;

/**
 * Global server-wide search endpoint.
 *
 * Query params:
 * - `q`: search query
 * - `limit`: optional max result count
 * - `offset`: zero-based pagination offset
 * - `types`: comma-separated list of `ServerSearchResultItem.type` values to keep
 * - `type`: repeated param to support backwards compatibility
 */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const limitFromQuery = Number.parseInt(request.nextUrl.searchParams.get('limit') || '', 10);
    const resultLimit = Number.isFinite(limitFromQuery)
        ? Math.max(1, Math.min(MAX_RESULT_LIMIT, limitFromQuery))
        : DEFAULT_RESULT_LIMIT;
    const offsetFromQuery = Number.parseInt(request.nextUrl.searchParams.get('offset') || '', 10);
    const offset = Number.isFinite(offsetFromQuery) ? Math.max(0, offsetFromQuery) : 0;
    const typeFiltersFromRepeatedParams = request.nextUrl.searchParams.getAll('type');
    const typeFiltersParam = request.nextUrl.searchParams.get('types');
    const typeFilterSet = new Set<string>();
    for (const value of typeFiltersFromRepeatedParams) {
        if (value.trim()) {
            typeFilterSet.add(value.trim());
        }
    }
    if (typeFiltersParam) {
        for (const token of typeFiltersParam.split(',')) {
            const trimmed = token.trim();
            if (trimmed) {
                typeFilterSet.add(trimmed);
            }
        }
    }

    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
        const emptyResponse: ServerSearchResponse = {
            query,
            items: [],
            totalCount: 0,
            offset: 0,
            limit: resultLimit,
        };
        return NextResponse.json(emptyResponse);
    }

    const [currentUser, adminFlag] = await Promise.all([getCurrentUser(), isUserAdmin()]);
    const providers = createDefaultServerSearchProviders();
    const providerResultLimit = Math.max(8, Math.ceil(resultLimit / 2));

    const { items, totalCount } = await runAggregatedServerSearch(
        providers,
        {
            query,
            limitPerProvider: providerResultLimit,
            currentUser,
            isAdmin: adminFlag,
        },
        {
            limit: resultLimit,
            offset,
            typeFilters: Array.from(typeFilterSet),
        },
    );

    const response: ServerSearchResponse = {
        query,
        items,
        totalCount,
        offset,
        limit: resultLimit,
    };

    return NextResponse.json(response);
}
