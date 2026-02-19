'use client';

import {
    BookOpenText,
    FileIcon,
    FolderOpen,
    Globe2,
    ImageIcon,
    Loader2,
    MessageSquareText,
    Search,
    Settings2,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import type { ServerSearchResponse, ServerSearchResultItem } from '../../search/ServerSearchResultItem';

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
 * Icon mapping for global search results.
 */
const RESULT_ICON_BY_TYPE: Record<ServerSearchResultItem['icon'], LucideIcon> = {
    agent: UserRound,
    book: BookOpenText,
    'federated-agent': Globe2,
    folder: FolderOpen,
    conversation: MessageSquareText,
    documentation: BookOpenText,
    metadata: Settings2,
    user: UserRound,
    message: MessageSquareText,
    file: FileIcon,
    image: ImageIcon,
    system: Settings2,
};

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
    placeholder = 'Search agents, folders, docs, conversations...',
    onNavigate,
}: HeaderSearchBoxProps) {
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

    /**
     * Groups results while preserving original order and adds stable option indexes.
     */
    const groupedResults = useMemo(() => {
        const groupMap = new Map<string, Array<ServerSearchResultItem & { optionIndex: number }>>();
        let optionIndex = 0;
        for (const item of results) {
            const existing = groupMap.get(item.group) || [];
            existing.push({ ...item, optionIndex });
            groupMap.set(item.group, existing);
            optionIndex += 1;
        }
        return Array.from(groupMap.entries()).map(([group, items]) => ({ group, items }));
    }, [results]);

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
                setErrorMessage('Search is temporarily unavailable.');
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => {
            abortController.abort();
        };
    }, [debouncedQuery, isOpen]);

    /**
     * Keeps active option index aligned with result length.
     */
    useEffect(() => {
        if (results.length === 0) {
            setActiveIndex(-1);
            return;
        }

        if (activeIndex >= results.length) {
            setActiveIndex(0);
        }
    }, [activeIndex, results]);

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
     * Handles keyboard interactions for listbox navigation.
     */
    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                setIsOpen(true);
                event.preventDefault();
            }
            return;
        }

        if (event.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (results.length === 0) {
                return;
            }
            setActiveIndex((previous) => (previous + 1 + results.length) % results.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (results.length === 0) {
                return;
            }
            setActiveIndex((previous) => (previous - 1 + results.length) % results.length);
            return;
        }

        if (event.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < results.length) {
                event.preventDefault();
                selectResult(results[activeIndex]);
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <label htmlFor="global-server-search" className="sr-only">
                Global search
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
                    placeholder={placeholder}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="global-server-search-results"
                    aria-autocomplete="list"
                    autoComplete="off"
                />
                {isLoading && (
                    <Loader2
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
                        aria-hidden
                    />
                )}
            </div>

            {isOpen && (
                <div
                    id="global-server-search-results"
                    className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40"
                    role="listbox"
                >
                    {query.trim().length < MIN_QUERY_LENGTH && (
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            Type at least {MIN_QUERY_LENGTH} characters to search the server.
                        </div>
                    )}

                    {query.trim().length >= MIN_QUERY_LENGTH && errorMessage && (
                        <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">{errorMessage}</div>
                    )}

                    {query.trim().length >= MIN_QUERY_LENGTH &&
                        !errorMessage &&
                        !isLoading &&
                        results.length === 0 && (
                            <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                                No results found for &quot;{query.trim()}&quot;.
                            </div>
                        )}

                    {query.trim().length >= MIN_QUERY_LENGTH &&
                        !errorMessage &&
                        groupedResults.map(({ group, items }) => (
                            <div key={group} className="mb-2 last:mb-0">
                                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    {group}
                                </div>
                                <div className="space-y-1">
                                    {items.map((item) => {
                                        const Icon = RESULT_ICON_BY_TYPE[item.icon] || Search;
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
