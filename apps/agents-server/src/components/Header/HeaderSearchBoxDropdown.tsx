'use client';

import { Search } from 'lucide-react';
import { useMemo } from 'react';
import { SEARCH_RESULT_ICON_BY_TYPE } from '../../search/searchIcons';
import type { ServerSearchResultItem } from '../../search/ServerSearchResultItem';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Props for the `HeaderSearchBoxDropdown` component.
 */
type HeaderSearchBoxDropdownProps = {
    /**
     * Currently highlighted option index.
     */
    readonly activeIndex: number;

    /**
     * Error shown when the search endpoint cannot be reached.
     */
    readonly errorMessage: string | null;

    /**
     * Indicates whether the typed query is long enough to search.
     */
    readonly hasMinimumQuery: boolean;

    /**
     * Search API results rendered in the dropdown.
     */
    readonly results: ReadonlyArray<ServerSearchResultItem>;

    /**
     * Indicates whether the no-results fallback should be rendered.
     */
    readonly showNoResultsMessage: boolean;

    /**
     * Trimmed query shown in labels and empty states.
     */
    readonly trimmedQuery: string;

    /**
     * Opens the full search results page.
     */
    readonly onOpenSearchPage: () => void;

    /**
     * Selects one result from the dropdown.
     */
    readonly onSelectResult: (item: ServerSearchResultItem) => void;

    /**
     * Updates the highlighted option index during hover navigation.
     */
    readonly onSetActiveIndex: (activeIndex: number) => void;
};

/**
 * Search result item enriched with the stable option index used by keyboard navigation.
 */
type HeaderSearchBoxGroupedItem = ServerSearchResultItem & {
    readonly optionIndex: number;
};

/**
 * Grouped search results rendered section-by-section in the dropdown.
 */
type HeaderSearchBoxGroupedResults = ReadonlyArray<{
    readonly group: string;
    readonly items: ReadonlyArray<HeaderSearchBoxGroupedItem>;
}>;

/**
 * Groups search results while preserving provider order and assigning option indexes.
 */
function groupHeaderSearchResults(
    results: ReadonlyArray<ServerSearchResultItem>,
    searchEntryCount: number,
): HeaderSearchBoxGroupedResults {
    const groupedResults = new Map<string, Array<HeaderSearchBoxGroupedItem>>();
    let optionIndex = searchEntryCount;

    for (const item of results) {
        const currentGroup = groupedResults.get(item.group) || [];
        currentGroup.push({ ...item, optionIndex });
        groupedResults.set(item.group, currentGroup);
        optionIndex += 1;
    }

    return Array.from(groupedResults.entries()).map(([group, items]) => ({
        group,
        items,
    }));
}

/**
 * Props for the dedicated "view all results" action rendered at the top of the dropdown.
 */
type HeaderSearchBoxSearchActionProps = {
    /**
     * Currently highlighted option index.
     */
    readonly activeIndex: number;

    /**
     * Label shown above the quoted query.
     */
    readonly label: string;

    /**
     * Trimmed query shown in the action description.
     */
    readonly trimmedQuery: string;

    /**
     * Opens the dedicated search page.
     */
    readonly onOpenSearchPage: () => void;

    /**
     * Highlights the action when hovered.
     */
    readonly onSetActiveIndex: (activeIndex: number) => void;
};

/**
 * Renders the dedicated search-page action above grouped search results.
 */
function HeaderSearchBoxSearchAction({
    activeIndex,
    label,
    trimmedQuery,
    onOpenSearchPage,
    onSetActiveIndex,
}: HeaderSearchBoxSearchActionProps) {
    const isActive = activeIndex === 0;

    return (
        <div className="mb-2 rounded-xl bg-slate-50/60 p-2">
            <button
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(event) => {
                    event.preventDefault();
                    onOpenSearchPage();
                }}
                onMouseEnter={() => onSetActiveIndex(0)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                    isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-100'
                }`}
            >
                <span className="flex flex-col text-left">
                    <span className="text-slate-700">{label}</span>
                    <span className="text-slate-500">&quot;{trimmedQuery}&quot;</span>
                </span>
                <Search className="h-4 w-4 text-slate-500" aria-hidden />
            </button>
        </div>
    );
}

/**
 * Props for one grouped block of search results.
 */
type HeaderSearchBoxResultGroupProps = {
    /**
     * Currently highlighted option index.
     */
    readonly activeIndex: number;

    /**
     * Visible label for the result group.
     */
    readonly group: string;

    /**
     * Search items rendered inside the group.
     */
    readonly items: ReadonlyArray<HeaderSearchBoxGroupedItem>;

    /**
     * Selects one search result.
     */
    readonly onSelectResult: (item: ServerSearchResultItem) => void;

    /**
     * Updates the highlighted option index during hover navigation.
     */
    readonly onSetActiveIndex: (activeIndex: number) => void;
};

/**
 * Renders one grouped section of search results.
 */
function HeaderSearchBoxResultGroup({
    activeIndex,
    group,
    items,
    onSelectResult,
    onSetActiveIndex,
}: HeaderSearchBoxResultGroupProps) {
    return (
        <div className="mb-2 last:mb-0">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {group}
            </div>
            <div className="space-y-1">
                {items.map((item) => (
                    <HeaderSearchBoxResultButton
                        key={item.id}
                        activeIndex={activeIndex}
                        item={item}
                        onSelectResult={onSelectResult}
                        onSetActiveIndex={onSetActiveIndex}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Props for one interactive dropdown result row.
 */
type HeaderSearchBoxResultButtonProps = {
    /**
     * Currently highlighted option index.
     */
    readonly activeIndex: number;

    /**
     * Search result item represented by the button.
     */
    readonly item: HeaderSearchBoxGroupedItem;

    /**
     * Selects one search result.
     */
    readonly onSelectResult: (item: ServerSearchResultItem) => void;

    /**
     * Updates the highlighted option index during hover navigation.
     */
    readonly onSetActiveIndex: (activeIndex: number) => void;
};

/**
 * Renders one search result row with icon, title, and snippet.
 */
function HeaderSearchBoxResultButton({
    activeIndex,
    item,
    onSelectResult,
    onSetActiveIndex,
}: HeaderSearchBoxResultButtonProps) {
    const Icon = SEARCH_RESULT_ICON_BY_TYPE[item.icon] || Search;
    const isActive = item.optionIndex === activeIndex;

    return (
        <button
            role="option"
            aria-selected={isActive}
            onMouseDown={(event) => {
                event.preventDefault();
                onSelectResult(item);
            }}
            onMouseEnter={() => onSetActiveIndex(item.optionIndex)}
            className={`flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition ${
                isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
            }`}
        >
            <span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-600">
                <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.snippet || item.href}</span>
            </span>
        </button>
    );
}

/**
 * Renders the grouped results dropdown used by `HeaderSearchBox`.
 *
 * @private component of HeaderSearchBox
 */
export function HeaderSearchBoxDropdown({
    activeIndex,
    errorMessage,
    hasMinimumQuery,
    results,
    showNoResultsMessage,
    trimmedQuery,
    onOpenSearchPage,
    onSelectResult,
    onSetActiveIndex,
}: HeaderSearchBoxDropdownProps) {
    const { t } = useServerLanguage();
    const searchEntryCount = hasMinimumQuery ? 1 : 0;
    const groupedResults = useMemo(
        () => groupHeaderSearchResults(results, searchEntryCount),
        [results, searchEntryCount],
    );

    return (
        <div
            id="global-server-search-results"
            className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40"
            role="listbox"
        >
            {hasMinimumQuery && (
                <HeaderSearchBoxSearchAction
                    activeIndex={activeIndex}
                    label={t('header.searchViewAllResultsFor')}
                    trimmedQuery={trimmedQuery}
                    onOpenSearchPage={onOpenSearchPage}
                    onSetActiveIndex={onSetActiveIndex}
                />
            )}

            {errorMessage && (
                <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">{errorMessage}</div>
            )}

            {showNoResultsMessage && (
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    {t('header.searchNoResultsFor')} &quot;{trimmedQuery}&quot;.
                </div>
            )}

            {results.length > 0 &&
                groupedResults.map(({ group, items }) => (
                    <HeaderSearchBoxResultGroup
                        key={group}
                        activeIndex={activeIndex}
                        group={group}
                        items={items}
                        onSelectResult={onSelectResult}
                        onSetActiveIndex={onSetActiveIndex}
                    />
                ))}
        </div>
    );
}
