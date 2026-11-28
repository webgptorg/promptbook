'use client';

import { useRouter } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import type { ServerSearchResponse, ServerSearchResultItem } from '../../search/ServerSearchResultItem';
import { pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Delay between keystrokes and server fetch calls.
 */
const SEARCH_DEBOUNCE_MS = 280;

/**
 * Minimum query length required to trigger search requests.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Total number of results requested from the search API.
 */
const SEARCH_RESULT_LIMIT = 36;

/**
 * Detects links that should bypass in-app routing.
 */
const ABSOLUTE_SEARCH_RESULT_HREF_PATTERN = /^https?:\/\//;

/**
 * Inputs required to connect the search box state to its DOM container and navigation side effects.
 */
type UseHeaderSearchBoxStateProps = {
    /**
     * Container used to detect outside pointer interactions.
     */
    readonly containerRef: RefObject<HTMLDivElement | null>;

    /**
     * Optional callback invoked after navigation triggered by the search box.
     */
    readonly onNavigate?: () => void;
};

/**
 * Debounces the trimmed query string while still allowing explicit immediate resets.
 */
function useDebouncedSearchQuery(query: string) {
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [query]);

    return {
        debouncedQuery,
        setDebouncedQuery,
    };
}

/**
 * Fetches search results for the current debounced query and exposes a shared reset helper.
 */
function useHeaderSearchResults({
    debouncedQuery,
    isOpen,
}: {
    readonly debouncedQuery: string;
    readonly isOpen: boolean;
}) {
    const { t } = useServerLanguage();
    const [results, setResults] = useState<ReadonlyArray<ServerSearchResultItem>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const clearSearchResults = useCallback(() => {
        setResults([]);
        setErrorMessage(null);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isOpen || debouncedQuery.length < MIN_QUERY_LENGTH) {
            clearSearchResults();
            return;
        }

        const abortController = new AbortController();
        setIsLoading(true);
        setErrorMessage(null);

        fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=${SEARCH_RESULT_LIMIT}`, {
            method: 'GET',
            cache: 'no-store',
            signal: abortController.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Search request failed (${response.status})`);
                }

                const payload = (await response.json()) as ServerSearchResponse;
                setResults(payload.items || []);
            })
            .catch((error) => {
                if (
                    typeof error === 'object' &&
                    error !== null &&
                    'name' in error &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                console.error('[search] Failed to fetch results:', error);
                setResults([]);
                setErrorMessage(t('header.searchUnavailable'));
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => {
            abortController.abort();
        };
    }, [clearSearchResults, debouncedQuery, isOpen, t]);

    return {
        clearSearchResults,
        errorMessage,
        isLoading,
        results,
    };
}

/**
 * Keeps the highlighted option aligned with the currently available dropdown entries.
 */
function useHeaderSearchActiveIndex(entryCount: number) {
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
        if (entryCount === 0) {
            setActiveIndex(-1);
            return;
        }

        setActiveIndex((previous) => {
            if (previous < 0) {
                return 0;
            }

            if (previous >= entryCount) {
                return entryCount - 1;
            }

            return previous;
        });
    }, [entryCount]);

    const moveToNextEntry = useCallback(() => {
        if (entryCount === 0) {
            return;
        }

        setActiveIndex((previous) => {
            const normalizedIndex = previous < 0 ? -1 : previous;
            const nextIndex = normalizedIndex + 1;
            return nextIndex >= entryCount ? 0 : nextIndex;
        });
    }, [entryCount]);

    const moveToPreviousEntry = useCallback(() => {
        if (entryCount === 0) {
            return;
        }

        setActiveIndex((previous) => {
            const normalizedIndex = previous < 0 ? entryCount : previous;
            const nextIndex = normalizedIndex - 1;
            return nextIndex < 0 ? entryCount - 1 : nextIndex;
        });
    }, [entryCount]);

    const resetActiveIndex = useCallback(() => {
        setActiveIndex(-1);
    }, []);

    const setActiveOptionIndex = useCallback((nextActiveIndex: number) => {
        setActiveIndex(nextActiveIndex);
    }, []);

    return {
        activeIndex,
        moveToNextEntry,
        moveToPreviousEntry,
        resetActiveIndex,
        setActiveOptionIndex,
    };
}

/**
 * Closes the dropdown when pointer interactions happen outside of the search box.
 */
function useCloseHeaderSearchOnOutsidePointerDown({
    containerRef,
    onCloseSearchBox,
}: {
    readonly containerRef: RefObject<HTMLDivElement | null>;
    readonly onCloseSearchBox: () => void;
}) {
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current) {
                return;
            }

            if (containerRef.current.contains(event.target as Node)) {
                return;
            }

            onCloseSearchBox();
        };

        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [containerRef, onCloseSearchBox]);
}

/**
 * Opens the dropdown or submits the full search page while the input is closed.
 */
function handleClosedSearchInputKeyDown({
    event,
    hasMinimumQuery,
    onOpenSearchBox,
    onOpenSearchPage,
}: {
    readonly event: KeyboardEvent<HTMLInputElement>;
    readonly hasMinimumQuery: boolean;
    readonly onOpenSearchBox: () => void;
    readonly onOpenSearchPage: () => void;
}) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        onOpenSearchBox();
        event.preventDefault();
        return;
    }

    if (event.key === 'Enter' && hasMinimumQuery) {
        event.preventDefault();
        onOpenSearchPage();
    }
}

/**
 * Resolves the active dropdown entry when the user confirms with Enter.
 */
function handleSearchInputSubmit({
    activeIndex,
    entryCount,
    hasMinimumQuery,
    results,
    searchEntryCount,
    onOpenSearchPage,
    onSelectResult,
}: {
    readonly activeIndex: number;
    readonly entryCount: number;
    readonly hasMinimumQuery: boolean;
    readonly results: ReadonlyArray<ServerSearchResultItem>;
    readonly searchEntryCount: number;
    readonly onOpenSearchPage: () => void;
    readonly onSelectResult: (item: ServerSearchResultItem) => void;
}) {
    if (!hasMinimumQuery) {
        return;
    }

    if (entryCount === 0 || (searchEntryCount > 0 && activeIndex === 0)) {
        onOpenSearchPage();
        return;
    }

    const resultIndex = activeIndex - searchEntryCount;
    const activeResult = results[resultIndex];

    if (activeResult) {
        onSelectResult(activeResult);
        return;
    }

    onOpenSearchPage();
}

/**
 * Handles dropdown keyboard navigation while the listbox is open.
 */
function handleOpenSearchInputKeyDown({
    activeIndex,
    entryCount,
    event,
    hasMinimumQuery,
    results,
    searchEntryCount,
    onCloseSearchBox,
    onMoveToNextEntry,
    onMoveToPreviousEntry,
    onOpenSearchPage,
    onSelectResult,
}: {
    readonly activeIndex: number;
    readonly entryCount: number;
    readonly event: KeyboardEvent<HTMLInputElement>;
    readonly hasMinimumQuery: boolean;
    readonly results: ReadonlyArray<ServerSearchResultItem>;
    readonly searchEntryCount: number;
    readonly onCloseSearchBox: () => void;
    readonly onMoveToNextEntry: () => void;
    readonly onMoveToPreviousEntry: () => void;
    readonly onOpenSearchPage: () => void;
    readonly onSelectResult: (item: ServerSearchResultItem) => void;
}) {
    if (event.key === 'Escape') {
        onCloseSearchBox();
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        onMoveToNextEntry();
        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        onMoveToPreviousEntry();
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        handleSearchInputSubmit({
            activeIndex,
            entryCount,
            hasMinimumQuery,
            results,
            searchEntryCount,
            onOpenSearchPage,
            onSelectResult,
        });
    }
}

/**
 * Orchestrates debounced search, dropdown state, and keyboard navigation for `HeaderSearchBox`.
 *
 * @private hook of HeaderSearchBox
 */
export function useHeaderSearchBoxState({
    containerRef,
    onNavigate,
}: UseHeaderSearchBoxStateProps) {
    const router = useRouter();
    const isHeadless = useIsHeadless();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const trimmedQuery = query.trim();
    const hasMinimumQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
    const searchEntryCount = hasMinimumQuery ? 1 : 0;
    const { debouncedQuery, setDebouncedQuery } = useDebouncedSearchQuery(query);
    const { clearSearchResults, errorMessage, isLoading, results } = useHeaderSearchResults({
        debouncedQuery,
        isOpen,
    });
    const entryCount = searchEntryCount + results.length;
    const { activeIndex, moveToNextEntry, moveToPreviousEntry, resetActiveIndex, setActiveOptionIndex } =
        useHeaderSearchActiveIndex(entryCount);
    const showNoResultsMessage =
        hasMinimumQuery && !isLoading && !errorMessage && results.length === 0;
    const shouldRenderDropdown =
        isOpen && hasMinimumQuery && (results.length > 0 || showNoResultsMessage || Boolean(errorMessage));

    const closeSearchBox = useCallback(() => {
        setIsOpen(false);
    }, []);

    const openSearchBox = useCallback(() => {
        setIsOpen(true);
    }, []);

    useCloseHeaderSearchOnOutsidePointerDown({
        containerRef,
        onCloseSearchBox: closeSearchBox,
    });

    const openSearchPage = useCallback(() => {
        if (!hasMinimumQuery) {
            return;
        }

        setIsOpen(false);
        pushWithHeadless(router, `/search?q=${encodeURIComponent(trimmedQuery)}`, isHeadless);
        onNavigate?.();
    }, [hasMinimumQuery, isHeadless, onNavigate, router, trimmedQuery]);

    const selectResult = useCallback(
        (item: ServerSearchResultItem) => {
            setIsOpen(false);
            setQuery('');
            setDebouncedQuery('');
            clearSearchResults();
            resetActiveIndex();

            if (item.isExternal || ABSOLUTE_SEARCH_RESULT_HREF_PATTERN.test(item.href)) {
                window.location.href = item.href;
            } else {
                pushWithHeadless(router, item.href, isHeadless);
            }

            onNavigate?.();
        },
        [
            clearSearchResults,
            isHeadless,
            onNavigate,
            resetActiveIndex,
            router,
            setDebouncedQuery,
        ],
    );

    const onInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    }, []);

    const onInputKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (!isOpen) {
                handleClosedSearchInputKeyDown({
                    event,
                    hasMinimumQuery,
                    onOpenSearchBox: openSearchBox,
                    onOpenSearchPage: openSearchPage,
                });
                return;
            }

            handleOpenSearchInputKeyDown({
                activeIndex,
                entryCount,
                event,
                hasMinimumQuery,
                results,
                searchEntryCount,
                onCloseSearchBox: closeSearchBox,
                onMoveToNextEntry: moveToNextEntry,
                onMoveToPreviousEntry: moveToPreviousEntry,
                onOpenSearchPage: openSearchPage,
                onSelectResult: selectResult,
            });
        },
        [
            activeIndex,
            closeSearchBox,
            entryCount,
            hasMinimumQuery,
            isOpen,
            moveToNextEntry,
            moveToPreviousEntry,
            openSearchBox,
            openSearchPage,
            results,
            searchEntryCount,
            selectResult,
        ],
    );

    return {
        activeIndex,
        errorMessage,
        hasMinimumQuery,
        isLoading,
        isOpen,
        query,
        results,
        shouldRenderDropdown,
        showNoResultsMessage,
        trimmedQuery,
        onInputChange,
        onInputFocus: openSearchBox,
        onInputKeyDown,
        openSearchPage,
        selectResult,
        setActiveIndex: setActiveOptionIndex,
    };
}
