'use client';

import { SearchPageForm } from './SearchPageForm';
import { SearchPageResults } from './SearchPageResults';
import { useSearchPageState } from './useSearchPageState';

/**
 * Renders the standalone `/search` page with filters, pagination, and result cards.
 *
 * @private route component of SearchPage
 */
export function SearchPageClient() {
    const {
        currentPage,
        endItem,
        errorMessage,
        filterOptions,
        goToPage,
        handleSearchSubmit,
        hasExplicitFilters,
        hasSearchQuery,
        isLoading,
        minSearchQueryLength,
        queryInput,
        resetFilters,
        searchResults,
        selectedTypes,
        setQueryInput,
        showPagination,
        startItem,
        toggleFilter,
        totalCount,
        totalPages,
        totalSearchSourceCount,
        trimmedQueryParam,
    } = useSearchPageState();

    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 py-6 px-4 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
                <SearchPageForm
                    filterOptions={filterOptions}
                    hasExplicitFilters={hasExplicitFilters}
                    minSearchQueryLength={minSearchQueryLength}
                    onQueryInputChange={setQueryInput}
                    onResetFilters={resetFilters}
                    onSearchSubmit={handleSearchSubmit}
                    onToggleFilter={toggleFilter}
                    queryInput={queryInput}
                    selectedTypes={selectedTypes}
                    totalSearchSourceCount={totalSearchSourceCount}
                />

                <SearchPageResults
                    currentPage={currentPage}
                    endItem={endItem}
                    errorMessage={errorMessage}
                    hasSearchQuery={hasSearchQuery}
                    isLoading={isLoading}
                    onGoToPage={goToPage}
                    searchResults={searchResults}
                    showPagination={showPagination}
                    startItem={startItem}
                    totalCount={totalCount}
                    totalPages={totalPages}
                    trimmedQueryParam={trimmedQueryParam}
                />
            </div>
        </div>
    );
}
