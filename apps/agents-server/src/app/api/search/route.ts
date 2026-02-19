import { NextRequest, NextResponse } from 'next/server';
import { createAggregatedServerSearchProvider } from '@/src/search/createAggregatedServerSearchProvider';
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
 */
export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const limitFromQuery = Number.parseInt(request.nextUrl.searchParams.get('limit') || '', 10);
    const resultLimit = Number.isFinite(limitFromQuery)
        ? Math.max(1, Math.min(MAX_RESULT_LIMIT, limitFromQuery))
        : DEFAULT_RESULT_LIMIT;

    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
        const emptyResponse: ServerSearchResponse = { query, items: [] };
        return NextResponse.json(emptyResponse);
    }

    const [currentUser, adminFlag] = await Promise.all([getCurrentUser(), isUserAdmin()]);
    const providers = createDefaultServerSearchProviders();
    const aggregatedProvider = createAggregatedServerSearchProvider(providers);
    const providerResultLimit = Math.max(8, Math.ceil(resultLimit / 2));

    const items = await aggregatedProvider.search({
        query,
        limitPerProvider: providerResultLimit,
        currentUser,
        isAdmin: adminFlag,
    });

    const response: ServerSearchResponse = {
        query,
        items: items.slice(0, resultLimit),
    };

    return NextResponse.json(response);
}
