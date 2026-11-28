import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

/**
 * Shared base classes for each search source toggle.
 *
 * @private function of SearchPageClient
 */
const FILTER_BUTTON_BASE_CLASSES =
    'rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

/**
 * Classes applied when a filter is active.
 *
 * @private function of SearchPageClient
 */
const FILTER_BUTTON_ACTIVE_CLASSES = 'border-blue-500 bg-blue-50 text-blue-700';

/**
 * Classes applied when a filter is inactive.
 *
 * @private function of SearchPageClient
 */
const FILTER_BUTTON_INACTIVE_CLASSES =
    'border-slate-200 bg-white text-slate-600 hover:border-slate-300 focus-visible:border-slate-300';

/**
 * One search-source filter option displayed above the result list.
 *
 * @private function of SearchPageClient
 */
type SearchPageFilterOption = {
    readonly label: string;
    readonly value: string;
};

/**
 * Props consumed by `SearchPageForm`.
 *
 * @private function of SearchPageClient
 */
type SearchPageFormProps = {
    filterOptions: ReadonlyArray<SearchPageFilterOption>;
    hasExplicitFilters: boolean;
    minSearchQueryLength: number;
    onQueryInputChange: (value: string) => void;
    onResetFilters: () => void;
    onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onToggleFilter: (typeValue: string) => void;
    queryInput: string;
    selectedTypes: ReadonlyArray<string>;
    totalSearchSourceCount: number;
};

/**
 * Props consumed by `SearchPageFilterButton`.
 *
 * @private function of SearchPageForm
 */
type SearchPageFilterButtonProps = {
    filter: SearchPageFilterOption;
    isActive: boolean;
    onToggleFilter: (typeValue: string) => void;
};

/**
 * Resolves the button classes for one filter toggle.
 *
 * @private function of SearchPageForm
 */
function getFilterButtonClassName(isActive: boolean): string {
    return `${FILTER_BUTTON_BASE_CLASSES} ${
        isActive ? FILTER_BUTTON_ACTIVE_CLASSES : FILTER_BUTTON_INACTIVE_CLASSES
    }`;
}

/**
 * Renders one selectable search-source pill.
 *
 * @private function of SearchPageForm
 */
function SearchPageFilterButton({ filter, isActive, onToggleFilter }: SearchPageFilterButtonProps) {
    return (
        <button
            type="button"
            onClick={() => onToggleFilter(filter.value)}
            aria-pressed={isActive}
            className={getFilterButtonClassName(isActive)}
        >
            {filter.label}
        </button>
    );
}

/**
 * Renders the search-page heading, query form, and source filters.
 *
 * @private function of SearchPageClient
 */
export function SearchPageForm({
    filterOptions,
    hasExplicitFilters,
    minSearchQueryLength,
    onQueryInputChange,
    onResetFilters,
    onSearchSubmit,
    onToggleFilter,
    queryInput,
    selectedTypes,
    totalSearchSourceCount,
}: SearchPageFormProps) {
    return (
        <>
            <header className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Search</p>
                <h1 className="text-2xl font-semibold text-slate-900">Search the Agents Server</h1>
                <p className="text-sm text-slate-500">
                    Type at least {minSearchQueryLength} characters and press Enter to view all matching agents,
                    folders, docs, conversations, metadata entries, messages, files, and more.
                </p>
            </header>

            <form className="space-y-4" onSubmit={onSearchSubmit}>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        value={queryInput}
                        onChange={(event) => onQueryInputChange(event.target.value)}
                        placeholder="Search agents, folders, docs, conversations..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        type="text"
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-blue-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-500"
                    >
                        Search
                    </button>
                </div>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                Search sources
                            </p>
                            <p className="text-sm text-slate-500">
                                All sources are included by default. Untoggle any pill to exclude that source from the
                                results.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                                {selectedTypes.length} of {totalSearchSourceCount} sources active
                            </span>
                            <button
                                type="button"
                                onClick={onResetFilters}
                                disabled={!hasExplicitFilters}
                                className={`text-xs font-semibold uppercase tracking-wide transition ${
                                    hasExplicitFilters ? 'text-blue-600 hover:text-blue-500' : 'text-slate-400'
                                }`}
                            >
                                Reset filters
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-3 lg:grid-cols-4">
                        {filterOptions.map((filter) => (
                            <SearchPageFilterButton
                                key={filter.value}
                                filter={filter}
                                isActive={selectedTypes.includes(filter.value)}
                                onToggleFilter={onToggleFilter}
                            />
                        ))}
                    </div>
                </section>
            </form>
        </>
    );
}
