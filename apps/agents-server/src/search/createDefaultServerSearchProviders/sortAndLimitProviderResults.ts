import type { ServerSearchResultItem } from '../ServerSearchResultItem';

/**
 * Sorts provider items by score/title and trims to provider limit.
 *
 * @param items Candidate results.
 * @param limit Maximum result count.
 * @returns Sorted and trimmed result list.
 * @private function of createDefaultServerSearchProviders
 */
export function sortAndLimitProviderResults(
    items: ReadonlyArray<ServerSearchResultItem>,
    limit: number,
): ReadonlyArray<ServerSearchResultItem> {
    return [...items]
        .sort((left, right) => {
            if (left.score !== right.score) {
                return right.score - left.score;
            }
            return left.title.localeCompare(right.title);
        })
        .slice(0, Math.max(1, limit));
}
