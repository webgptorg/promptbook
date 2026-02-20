'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { HeadlessLink, pushWithHeadless, useIsHeadless } from '@/src/components/_utils/headlessParam';
import { SEARCH_RESULT_ICON_BY_TYPE, SEARCH_RESULT_ICON_LABELS } from '@/src/search/searchIcons';
import type { ServerSearchResponse, ServerSearchResultItem } from '@/src/search/ServerSearchResultItem';

/**
 * Number of items requested per search page.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const PAGE_SIZE = 24;

/**
 * Minimum number of characters that trigger the global search endpoint.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Filter options derived from the shared icon labels used by the search helpers.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const SEARCH_FILTER_OPTIONS = Object.entries(SEARCH_RESULT_ICON_LABELS)
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));

/**
 * Builds a `/search` URL with the provided search params.
 *
 * @private Internal helper for `apps/agents-server`.
 */
const buildSearchUrl = (params: URLSearchParams): string => {
    const query = params.toString();
    return query ? `/search?${query}` : '/search';
};

/**
 * Renders the standalone `/search` page with filters, pagination, and result cards.
 *
 * @private Internal view for `apps/agents-server`.
 */
export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isHeadless = useIsHeadless();

    const queryParam = searchParams.get('q') ?? '';
    const pageParam = Number.parseInt(searchParams.get('page') || '', 10);
    const currentPage = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
    const trimmedQueryParam = queryParam.trim();
    const hasSearchQuery = trimmedQueryParam.length >= MIN_SEARCH_QUERY_LENGTH;

    const selectedTypes = useMemo(() => {
        const filters = new Set<string>();
        for (const type of searchParams.getAll('type')) {
            const trimmed = type.trim();
            if (trimmed) {
                filters.add(trimmed);
            }
        }

        const typesParam = searchParams.get('types');
        if (typesParam) {
            for (const value of typesParam.split(',')) {
                const trimmed = value.trim();
                if (trimmed) {
                    filters.add(trimmed);
                }
            }
        }

        return Array.from(filters).sort();
    }, [searchParams.toString()]);

    const [queryInput, setQueryInput] = useState(queryParam);
    useEffect(() => {
        setQueryInput(queryParam);
    }, [queryParam]);

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
        setIsLoading(true);
        setErrorMessage(null);

        const params = new URLSearchParams();
        params.set('q', trimmedQueryParam);
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String((currentPage - 1) * PAGE_SIZE));
        if (selectedTypes.length > 0) {
            params.set('types', selectedTypes.join(','));
        }

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

                setSearchResults(payload.items || []);
                setTotalCount(payload.totalCount ?? payload.items.length);
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

        return () => controller.abort();
    }, [trimmedQueryParam, currentPage, selectedTypes.join(',')]);

    const updateSearchParams = (overrides: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
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
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedInput = queryInput.trim();
        updateSearchParams({
            q: trimmedInput || null,
            page: '1',
        });
    };

    const toggleFilter = (typeValue: string) => {
        const nextFilters = new Set(selectedTypes);
        if (nextFilters.has(typeValue)) {
            nextFilters.delete(typeValue);
        } else {
            nextFilters.add(typeValue);
        }

        const nextValue = nextFilters.size > 0 ? Array.from(nextFilters).join(',') : null;
        updateSearchParams({
            types: nextValue,
            page: '1',
        });
    };

    const goToPage = (page: number) => {
        updateSearchParams({ page: String(page) });
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const showPagination = hasSearchQuery && totalCount > PAGE_SIZE;
    const startItem = hasSearchQuery ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const endItem = hasSearchQuery ? Math.min(totalCount, currentPage * PAGE_SIZE) : 0;

    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 py-6 px-4 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
                <header className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Search</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Search the Agents Server</h1>
                    <p className="text-sm text-slate-500">
                        Type at least {MIN_SEARCH_QUERY_LENGTH} characters and press Enter to view all matching agents, folders,
                        docs, conversations, metadata entries, messages, files, and more.
                    </p>
                </header>

                <form className="space-y-4" onSubmit={handleSearchSubmit}>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            value={queryInput}
                            onChange={(event) => setQueryInput(event.target.value)}
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
                    <div className="flex flex-wrap gap-2">
                        {SEARCH_FILTER_OPTIONS.map((filter) => {
                            const isActive = selectedTypes.includes(filter.value);
                            return (
                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() => toggleFilter(filter.value)}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        isActive
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                </form>

                <section className="space-y-3">
                    {hasSearchQuery ? (
                        <p className="text-sm text-slate-500">
                            Showing {startItem}-{endItem} of {totalCount} matching items.
                        </p>
                    ) : (
                        <p className="text-sm text-slate-500">
                            No query entered. Type something above to trigger a search.
                        </p>
                    )}

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

                    {!isLoading && hasSearchQuery && searchResults.length === 0 && !errorMessage && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                            No results found for &quot;{trimmedQueryParam}&quot;.
                        </div>
                    )}

                    <ul className="space-y-3">
                        {searchResults.map((item) => {
                            const Icon = SEARCH_RESULT_ICON_BY_TYPE[item.icon] || Search;
                            const isExternal = item.isExternal || /^https?:\/\//.test(item.href);
                            const ResultContent = (
                                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-900/5 transition hover:border-slate-200">
                                    <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
                                        <Icon className="h-5 w-5" aria-hidden />
                                    </span>
                                    <div className="min-w-0 space-y-1">
                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                        <p className="text-xs text-slate-500">{item.snippet || item.href}</p>
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                                            {item.group}
                                        </p>
                                    </div>
                                </div>
                            );

                            return (
                                <li key={item.id}>
                                    {isExternal ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block"
                                        >
                                            {ResultContent}
                                        </a>
                                    ) : (
                                        <HeadlessLink href={item.href} className="block">
                                            {ResultContent}
                                        </HeadlessLink>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {showPagination && (
                    <footer className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="rounded-full border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => goToPage(currentPage + 1)}
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
                )}
            </div>
        </div>
    );
}
