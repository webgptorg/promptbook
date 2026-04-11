import { HeadlessLink } from '@/src/components/_utils/headlessParam';
import { SEARCH_RESULT_ICON_BY_TYPE } from '@/src/search/searchIcons';
import type { ServerSearchResultItem } from '@/src/search/ServerSearchResultItem';
import { Search } from 'lucide-react';

/**
 * Props consumed by `SearchPageResults`.
 *
 * @private function of SearchPageClient
 */
type SearchPageResultsProps = {
    currentPage: number;
    endItem: number;
    errorMessage: string | null;
    hasSearchQuery: boolean;
    isLoading: boolean;
    onGoToPage: (page: number) => void;
    searchResults: ReadonlyArray<ServerSearchResultItem>;
    showPagination: boolean;
    startItem: number;
    totalCount: number;
    totalPages: number;
    trimmedQueryParam: string;
};

/**
 * Props consumed by `SearchPageResultCard`.
 *
 * @private function of SearchPageResults
 */
type SearchPageResultCardProps = {
    item: ServerSearchResultItem;
};

/**
 * Props consumed by `SearchPageResultsSummary`.
 *
 * @private function of SearchPageResults
 */
type SearchPageResultsSummaryProps = Pick<SearchPageResultsProps, 'endItem' | 'hasSearchQuery' | 'startItem' | 'totalCount'>;

/**
 * Props consumed by `SearchPagePagination`.
 *
 * @private function of SearchPageResults
 */
type SearchPagePaginationProps = Pick<SearchPageResultsProps, 'currentPage' | 'onGoToPage' | 'totalPages'>;

/**
 * Determines whether the result target should bypass client-side routing.
 *
 * @private function of SearchPageResults
 */
function isExternalSearchResult(item: ServerSearchResultItem): boolean {
    return item.isExternal || /^https?:\/\//.test(item.href);
}

/**
 * Renders the search summary shown above the result list.
 *
 * @private function of SearchPageResults
 */
function SearchPageResultsSummary({
    endItem,
    hasSearchQuery,
    startItem,
    totalCount,
}: SearchPageResultsSummaryProps) {
    if (!hasSearchQuery) {
        return <p className="text-sm text-slate-500">No query entered. Type something above to trigger a search.</p>;
    }

    return (
        <p className="text-sm text-slate-500">
            Showing {startItem}-{endItem} of {totalCount} matching items.
        </p>
    );
}

/**
 * Renders one clickable search result card.
 *
 * @private function of SearchPageResults
 */
function SearchPageResultCard({ item }: SearchPageResultCardProps) {
    const Icon = SEARCH_RESULT_ICON_BY_TYPE[item.icon] || Search;
    const resultContent = (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-900/5 transition hover:border-slate-200">
            <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
                <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.snippet || item.href}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{item.group}</p>
            </div>
        </div>
    );

    if (isExternalSearchResult(item)) {
        return (
            <a href={item.href} target="_blank" rel="noreferrer" className="block">
                {resultContent}
            </a>
        );
    }

    return (
        <HeadlessLink href={item.href} className="block">
            {resultContent}
        </HeadlessLink>
    );
}

/**
 * Renders the footer pagination controls for multi-page search results.
 *
 * @private function of SearchPageResults
 */
function SearchPagePagination({ currentPage, onGoToPage, totalPages }: SearchPagePaginationProps) {
    return (
        <footer className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onGoToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="rounded-full border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => onGoToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-full border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
            <span>
                Page {currentPage} of {totalPages}
            </span>
        </footer>
    );
}

/**
 * Renders the search summary, messages, result cards, and pagination controls.
 *
 * @private function of SearchPageClient
 */
export function SearchPageResults({
    currentPage,
    endItem,
    errorMessage,
    hasSearchQuery,
    isLoading,
    onGoToPage,
    searchResults,
    showPagination,
    startItem,
    totalCount,
    totalPages,
    trimmedQueryParam,
}: SearchPageResultsProps) {
    const showEmptyState = !isLoading && hasSearchQuery && searchResults.length === 0 && !errorMessage;

    return (
        <>
            <section className="space-y-3">
                <SearchPageResultsSummary
                    endItem={endItem}
                    hasSearchQuery={hasSearchQuery}
                    startItem={startItem}
                    totalCount={totalCount}
                />

                {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                {isLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                        Loading search results…
                    </div>
                )}

                {showEmptyState && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                        No results found for &quot;{trimmedQueryParam}&quot;.
                    </div>
                )}

                <ul className="space-y-3">
                    {searchResults.map((item) => (
                        <li key={item.id}>
                            <SearchPageResultCard item={item} />
                        </li>
                    ))}
                </ul>
            </section>

            {showPagination && (
                <SearchPagePagination currentPage={currentPage} onGoToPage={onGoToPage} totalPages={totalPages} />
            )}
        </>
    );
}
