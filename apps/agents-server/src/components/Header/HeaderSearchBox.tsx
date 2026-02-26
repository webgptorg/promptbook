'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import { SEARCH_RESULT_ICON_BY_TYPE } from '../../search/searchIcons';
import type { ServerSearchResponse, ServerSearchResultItem } from '../../search/ServerSearchResultItem';
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
 * Props for the shared global-search box component.
 */
type HeaderSearchBoxProps = {
    /**
     * Optional wrapper class names.
     */
    className?: string;

    /**
     * Optional input placeholder override.
     */
    placeholder?: string;

    /**
     * Callback invoked after selecting one result.
     */
    onNavigate?: () => void;
};

/**
 * Renders the server-wide search box with debounced API querying and keyboard navigation.
 */
export function HeaderSearchBox({
    className = '',
    placeholder,
    onNavigate,
}: HeaderSearchBoxProps) {
    const { t } = useServerLanguage();
    const router = useRouter();
    const isHeadless = useIsHeadless();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [results, setResults] = useState<ReadonlyArray<ServerSearchResultItem>>([]);
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const trimmedQuery = query.trim();
    const hasMinimumQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
    const searchEntryCount = hasMinimumQuery ? 1 : 0;
    const showNoResultsMessage =
        hasMinimumQuery && !isLoading && !errorMessage && results.length === 0;
    const shouldRenderDropdown =
        isOpen && hasMinimumQuery && (results.length > 0 || showNoResultsMessage || Boolean(errorMessage));

    /**
     * Groups results while preserving original order and adds stable option indexes.
     */
    const groupedResults = useMemo(() => {
        const groupMap = new Map<string, Array<ServerSearchResultItem & { optionIndex: number }>>();
        let optionIndex = searchEntryCount;
        for (const item of results) {
            const existing = groupMap.get(item.group) || [];
            existing.push({ ...item, optionIndex });
            groupMap.set(item.group, existing);
            optionIndex += 1;
        }
        return Array.from(groupMap.entries()).map(([group, items]) => ({ group, items }));
    }, [results, searchEntryCount]);

    /**
     * Debounces typing so the client does not flood the API endpoint.
     */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [query]);

    /**
     * Fetches results whenever the debounced query changes.
     */
    useEffect(() => {
        if (!isOpen || debouncedQuery.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setErrorMessage(null);
            setIsLoading(false);
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
                if ((error as { name?: string }).name === 'AbortError') {
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
    }, [debouncedQuery, isOpen, t]);

    /**
     * Keeps active option index aligned with the current dropdown entries.
     */
    useEffect(() => {
        const entryCount = searchEntryCount + results.length;
        if (entryCount === 0) {
            setActiveIndex(-1);
            return;
        }

        setActiveIndex((previous) => {
            if (previous < 0) {
                return searchEntryCount > 0 ? 0 : 0;
            }
            if (previous >= entryCount) {
                return entryCount - 1;
            }
            return previous;
        });
    }, [results.length, searchEntryCount]);

    /**
     * Closes dropdown when user clicks outside the search box.
     */
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current) {
                return;
            }

            if (containerRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, []);

    /**
     * Selects one result and navigates to its target link.
     */
    const selectResult = (item: ServerSearchResultItem) => {
        setIsOpen(false);
        setQuery('');
        setDebouncedQuery('');
        setResults([]);
        setActiveIndex(-1);

        if (item.isExternal || /^https?:\/\//.test(item.href)) {
            window.location.href = item.href;
        } else {
            pushWithHeadless(router, item.href, isHeadless);
        }

        onNavigate?.();
    };

    /**
     * Opens the dedicated search page for the current query.
     */
    const openSearchPage = () => {
        if (!hasMinimumQuery) {
            return;
        }
        setIsOpen(false);
        pushWithHeadless(router, `/search?q=${encodeURIComponent(trimmedQuery)}`, isHeadless);
        onNavigate?.();
    };

    /**
     * Handles keyboard interactions for listbox navigation.
     */
    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                setIsOpen(true);
                event.preventDefault();
                return;
            }
            if (event.key === 'Enter' && hasMinimumQuery) {
                event.preventDefault();
                openSearchPage();
            }
            return;
        }

        if (event.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        const entryCount = searchEntryCount + results.length;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (entryCount === 0) {
                return;
            }
            setActiveIndex((previous) => {
                const normalized = previous < 0 ? -1 : previous;
                const next = normalized + 1;
                return next >= entryCount ? 0 : next;
            });
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (entryCount === 0) {
                return;
            }
            setActiveIndex((previous) => {
                const normalized = previous < 0 ? entryCount : previous;
                const next = normalized - 1;
                return next < 0 ? entryCount - 1 : next;
            });
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (!hasMinimumQuery) {
                return;
            }
            if (entryCount === 0) {
                openSearchPage();
                return;
            }
            if (searchEntryCount > 0 && activeIndex === 0) {
                openSearchPage();
                return;
            }
            const resultIndex = activeIndex - searchEntryCount;
            if (resultIndex >= 0 && resultIndex < results.length) {
                selectResult(results[resultIndex]);
            } else {
                openSearchPage();
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <label htmlFor="global-server-search" className="sr-only">
                {t('header.searchGlobalLabel')}
            </label>
            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                />
                <input
                    id="global-server-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={onInputKeyDown}
                    placeholder={placeholder || t('header.searchBoxDefaultPlaceholder')}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="global-server-search-results"
                    aria-autocomplete="list"
                    autoComplete="off"
                />
                {isLoading && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    </span>
                )}
            </div>

            {shouldRenderDropdown && (
                <div
                    id="global-server-search-results"
                    className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40"
                    role="listbox"
                >
                    {hasMinimumQuery && (
                        <div className="mb-2 rounded-xl bg-slate-50/60 p-2">
                            <button
                                type="button"
                                role="option"
                                aria-selected={hasMinimumQuery && activeIndex === 0}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    openSearchPage();
                                }}
                                onMouseEnter={() => setActiveIndex(0)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                                    activeIndex === 0
                                        ? 'bg-blue-50 ring-1 ring-blue-200'
                                        : 'hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex flex-col text-left">
                                    <span className="text-slate-700">
                                        {t('header.searchViewAllResultsFor')}
                                    </span>
                                    <span className="text-slate-500">&quot;{trimmedQuery}&quot;</span>
                                </span>
                                <Search className="h-4 w-4 text-slate-500" aria-hidden />
                            </button>
                        </div>
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
                            <div key={group} className="mb-2 last:mb-0">
                                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    {group}
                                </div>
                                <div className="space-y-1">
                                    {items.map((item) => {
                                        const Icon = SEARCH_RESULT_ICON_BY_TYPE[item.icon] || Search;
                                        const isActive = item.optionIndex === activeIndex;

                                        return (
                                            <button
                                                key={item.id}
                                                role="option"
                                                aria-selected={isActive}
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    selectResult(item);
                                                }}
                                                onMouseEnter={() => setActiveIndex(item.optionIndex)}
                                                className={`flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition ${
                                                    isActive
                                                        ? 'bg-blue-50 ring-1 ring-blue-200'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-600">
                                                    <Icon className="h-4 w-4" aria-hidden />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-slate-800">
                                                        {item.title}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-slate-500">
                                                        {item.snippet || item.href}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
