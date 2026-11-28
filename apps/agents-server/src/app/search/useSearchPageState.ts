'use client';

import { pushWithHeadless, useIsHeadless } from '@/src/components/_utils/headlessParam';
import { SEARCH_RESULT_ICON_LABELS } from '@/src/search/searchIcons';
import type { ServerSearchResponse, ServerSearchResultItem } from '@/src/search/ServerSearchResultItem';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

/**
 * Number of items requested per search page.
 *
 * @private function of SearchPageClient
 */
const PAGE_SIZE = 24;

/**
 * Minimum number of characters that trigger the global search endpoint.
 *
 * @private function of SearchPageClient
 */
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Debounce delay (in milliseconds) for persisting the query in the URL.
 *
 * @private function of SearchPageClient
 */
const QUERY_PARAM_DEBOUNCE_MS = 400;

/**
 * Filter options derived from the shared icon labels used by the search helpers.
 *
 * @private function of SearchPageClient
 */
const SEARCH_FILTER_OPTIONS = Object.entries(SEARCH_RESULT_ICON_LABELS)
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));

/**
 * Values that should be treated as the default searchable sources.
 *
 * @private function of SearchPageClient
 */
const DEFAULT_TYPE_FILTERS = SEARCH_FILTER_OPTIONS.map((option) => option.value);

/**
 * One filter option displayed in the standalone search UI.
 *
 * @private function of SearchPageClient
 */
type SearchPageFilterOption = {
    readonly label: string;
    readonly value: string;
};

/**
 * Normalized filter selection derived from the current URL state.
 *
 * @private function of SearchPageClient
 */
type ResolvedSearchTypes = {
    readonly hasExplicitFilters: boolean;
    readonly selectedTypes: ReadonlyArray<string>;
    readonly selectedTypesKey: string;
};

/**
 * Search-result state tracked for the paginated `/search` page.
 *
 * @private function of SearchPageClient
 */
type SearchPageResultsState = {
    readonly errorMessage: string | null;
    readonly isLoading: boolean;
    readonly searchResults: ReadonlyArray<ServerSearchResultItem>;
    readonly totalCount: number;
};

/**
 * Pagination metadata derived from the current query and result count.
 *
 * @private function of SearchPageClient
 */
type SearchPagePaginationState = {
    readonly endItem: number;
    readonly showPagination: boolean;
    readonly startItem: number;
    readonly totalPages: number;
};

/**
 * Props consumed by `useSearchPageQueryInput`.
 *
 * @private function of SearchPageClient
 */
type UseSearchPageQueryInputProps = {
    queryParam: string;
    trimmedQueryParam: string;
    updateSearchParams: (overrides: Record<string, string | null>) => void;
};

/**
 * Query-input state and handlers returned by `useSearchPageQueryInput`.
 *
 * @private function of SearchPageClient
 */
type SearchPageQueryInputState = {
    readonly handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
    readonly queryInput: string;
    readonly setQueryInput: (value: string) => void;
};

/**
 * Props consumed by `useSearchPageResults`.
 *
 * @private function of SearchPageClient
 */
type UseSearchPageResultsProps = {
    currentPage: number;
    hasSearchQuery: boolean;
    selectedTypesKey: string;
    trimmedQueryParam: string;
};

/**
 * Result returned by `useSearchPageState`.
 *
 * @private function of SearchPageClient
 */
type UseSearchPageStateResult = {
    currentPage: number;
    endItem: number;
    errorMessage: string | null;
    filterOptions: ReadonlyArray<SearchPageFilterOption>;
    goToPage: (page: number) => void;
    handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
    hasExplicitFilters: boolean;
    hasSearchQuery: boolean;
    isLoading: boolean;
    minSearchQueryLength: number;
    queryInput: string;
    resetFilters: () => void;
    searchResults: ReadonlyArray<ServerSearchResultItem>;
    selectedTypes: ReadonlyArray<string>;
    setQueryInput: (value: string) => void;
    showPagination: boolean;
    startItem: number;
    toggleFilter: (typeValue: string) => void;
    totalCount: number;
    totalPages: number;
    totalSearchSourceCount: number;
    trimmedQueryParam: string;
};

/**
 * Builds a `/search` URL with the provided search params.
 *
 * @private function of SearchPageClient
 */
function buildSearchUrl(params: URLSearchParams): string {
    const query = params.toString();
    return query ? `/search?${query}` : '/search';
}

/**
 * Resolves a valid one-based page number from the URL search params.
 *
 * @private function of SearchPageClient
 */
function resolveCurrentPage(pageParam: string | null): number {
    const parsedPage = Number.parseInt(pageParam || '', 10);
    return Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
}

/**
 * Normalizes selected search types from repeated `type` params and legacy `types` CSV params.
 *
 * @private function of SearchPageClient
 */
function resolveSelectedTypes(searchParamsString: string): ResolvedSearchTypes {
    const params = new URLSearchParams(searchParamsString);
    const filters = new Set<string>();

    for (const type of params.getAll('type')) {
        const trimmedType = type.trim();
        if (trimmedType) {
            filters.add(trimmedType);
        }
    }

    const typesParam = params.get('types');
    if (typesParam) {
        for (const value of typesParam.split(',')) {
            const trimmedType = value.trim();
            if (trimmedType) {
                filters.add(trimmedType);
            }
        }
    }

    const sortedFilters = Array.from(filters).sort();
    const hasExplicitFilters = sortedFilters.length > 0;

    return {
        hasExplicitFilters,
        selectedTypes: hasExplicitFilters ? sortedFilters : DEFAULT_TYPE_FILTERS,
        selectedTypesKey: hasExplicitFilters ? sortedFilters.join(',') : '',
    };
}

/**
 * Builds the API request params for one paginated search fetch.
 *
 * @private function of SearchPageClient
 */
function buildSearchRequestParams({
    currentPage,
    selectedTypesKey,
    trimmedQueryParam,
}: UseSearchPageResultsProps): URLSearchParams {
    const params = new URLSearchParams();
    params.set('q', trimmedQueryParam);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((currentPage - 1) * PAGE_SIZE));

    if (selectedTypesKey) {
        params.set('types', selectedTypesKey);
    }

    return params;
}

/**
 * Derives pagination details from the current result count.
 *
 * @private function of SearchPageClient
 */
function resolvePaginationState({
    currentPage,
    hasSearchQuery,
    totalCount,
}: Pick<UseSearchPageStateResult, 'currentPage' | 'hasSearchQuery' | 'totalCount'>): SearchPagePaginationState {
    return {
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        showPagination: hasSearchQuery && totalCount > PAGE_SIZE,
        startItem: hasSearchQuery ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
        endItem: hasSearchQuery ? Math.min(totalCount, currentPage * PAGE_SIZE) : 0,
    };
}

/**
 * Memoizes the current set of selected search-source filters from the URL.
 *
 * @private function of SearchPageClient
 */
function useSelectedSearchTypes(searchParamsString: string): ResolvedSearchTypes {
    return useMemo(() => resolveSelectedTypes(searchParamsString), [searchParamsString]);
}

/**
 * Tracks the search input field and keeps it synchronized with the `q` query param.
 *
 * @private function of SearchPageClient
 */
function useSearchPageQueryInput({
    queryParam,
    trimmedQueryParam,
    updateSearchParams,
}: UseSearchPageQueryInputProps): SearchPageQueryInputState {
    const [queryInput, setQueryInput] = useState(queryParam);
    const queryDebounceTimerRef = useRef<number | null>(null);

    useEffect(() => {
        setQueryInput(queryParam);
    }, [queryParam]);

    useEffect(() => {
        const trimmedInput = queryInput.trim();
        if (trimmedInput === trimmedQueryParam) {
            return;
        }

        const timer = window.setTimeout(() => {
            queryDebounceTimerRef.current = null;
            updateSearchParams({
                q: trimmedInput || null,
                page: trimmedInput ? '1' : null,
            });
        }, QUERY_PARAM_DEBOUNCE_MS);

        queryDebounceTimerRef.current = timer;

        return () => {
            window.clearTimeout(timer);
            if (queryDebounceTimerRef.current === timer) {
                queryDebounceTimerRef.current = null;
            }
        };
    }, [queryInput, trimmedQueryParam, updateSearchParams]);

    const handleSearchSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const trimmedInput = queryInput.trim();
            if (queryDebounceTimerRef.current !== null) {
                window.clearTimeout(queryDebounceTimerRef.current);
                queryDebounceTimerRef.current = null;
            }

            updateSearchParams({
                q: trimmedInput || null,
                page: trimmedInput ? '1' : null,
            });
        },
        [queryInput, updateSearchParams],
    );

    const setQueryInputValue = useCallback((value: string) => {
        setQueryInput(value);
    }, []);

    return {
        handleSearchSubmit,
        queryInput,
        setQueryInput: setQueryInputValue,
    };
}

/**
 * Fetches paginated search results whenever the query, page, or filters change.
 *
 * @private function of SearchPageClient
 */
function useSearchPageResults({
    currentPage,
    hasSearchQuery,
    selectedTypesKey,
    trimmedQueryParam,
}: UseSearchPageResultsProps): SearchPageResultsState {
    const [searchResults, setSearchResults] = useState<ReadonlyArray<ServerSearchResultItem>>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!hasSearchQuery) {
            setSearchResults([]);
            setTotalCount(0);
            setErrorMessage(null);
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        const params = buildSearchRequestParams({
            currentPage,
            hasSearchQuery,
            selectedTypesKey,
            trimmedQueryParam,
        });

        setIsLoading(true);
        setErrorMessage(null);

        fetch(`/api/search?${params.toString()}`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Search request failed (${response.status})`);
                }

                const payload = (await response.json()) as ServerSearchResponse;
                if (controller.signal.aborted) {
                    return;
                }

                const items = payload.items || [];
                setSearchResults(items);
                setTotalCount(payload.totalCount ?? items.length);
            })
            .catch((error) => {
                if ((error as { name?: string }).name === 'AbortError') {
                    return;
                }

                console.error('[search] Failed to fetch page results:', error);
                setSearchResults([]);
                setTotalCount(0);
                setErrorMessage('Search is temporarily unavailable.');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => {
            controller.abort();
        };
    }, [currentPage, hasSearchQuery, selectedTypesKey, trimmedQueryParam]);

    return {
        errorMessage,
        isLoading,
        searchResults,
        totalCount,
    };
}

/**
 * Orchestrates URL state, debounced input syncing, filters, pagination, and result loading.
 *
 * @private function of SearchPageClient
 */
export function useSearchPageState(): UseSearchPageStateResult {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsString = searchParams?.toString() ?? '';
    const isHeadless = useIsHeadless();

    const queryParam = searchParams?.get('q') ?? '';
    const currentPage = resolveCurrentPage(searchParams?.get('page') ?? null);
    const trimmedQueryParam = queryParam.trim();
    const hasSearchQuery = trimmedQueryParam.length >= MIN_SEARCH_QUERY_LENGTH;

    const { hasExplicitFilters, selectedTypes, selectedTypesKey } = useSelectedSearchTypes(searchParamsString);

    const updateSearchParams = useCallback(
        (overrides: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParamsString);
            params.delete('headless');
            params.delete('type');
            params.delete('types');

            for (const [key, value] of Object.entries(overrides)) {
                if (value === null) {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }

            pushWithHeadless(router, buildSearchUrl(params), isHeadless);
        },
        [isHeadless, router, searchParamsString],
    );

    const { handleSearchSubmit, queryInput, setQueryInput } = useSearchPageQueryInput({
        queryParam,
        trimmedQueryParam,
        updateSearchParams,
    });

    const { errorMessage, isLoading, searchResults, totalCount } = useSearchPageResults({
        currentPage,
        hasSearchQuery,
        selectedTypesKey,
        trimmedQueryParam,
    });

    const toggleFilter = useCallback(
        (typeValue: string) => {
            const nextFilters = new Set(selectedTypes);

            if (nextFilters.has(typeValue)) {
                if (nextFilters.size === 1) {
                    return;
                }

                nextFilters.delete(typeValue);
            } else {
                nextFilters.add(typeValue);
            }

            const nextFiltersArray = Array.from(nextFilters).sort();
            const usesAllFilters = nextFiltersArray.length === DEFAULT_TYPE_FILTERS.length;

            updateSearchParams({
                types: usesAllFilters ? null : nextFiltersArray.join(','),
                page: '1',
            });
        },
        [selectedTypes, updateSearchParams],
    );

    const resetFilters = useCallback(() => {
        if (!hasExplicitFilters) {
            return;
        }

        updateSearchParams({
            types: null,
            page: '1',
        });
    }, [hasExplicitFilters, updateSearchParams]);

    const goToPage = useCallback(
        (page: number) => {
            updateSearchParams({ page: String(page) });
        },
        [updateSearchParams],
    );

    const { endItem, showPagination, startItem, totalPages } = useMemo(
        () =>
            resolvePaginationState({
                currentPage,
                hasSearchQuery,
                totalCount,
            }),
        [currentPage, hasSearchQuery, totalCount],
    );

    return {
        currentPage,
        endItem,
        errorMessage,
        filterOptions: SEARCH_FILTER_OPTIONS,
        goToPage,
        handleSearchSubmit,
        hasExplicitFilters,
        hasSearchQuery,
        isLoading,
        minSearchQueryLength: MIN_SEARCH_QUERY_LENGTH,
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
        totalSearchSourceCount: DEFAULT_TYPE_FILTERS.length,
        trimmedQueryParam,
    };
}
