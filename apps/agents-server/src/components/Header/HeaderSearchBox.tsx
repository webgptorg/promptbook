'use client';

import { Search } from 'lucide-react';
import { useRef } from 'react';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { HeaderSearchBoxDropdown } from './HeaderSearchBoxDropdown';
import { useHeaderSearchBoxState } from './useHeaderSearchBoxState';

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const {
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
        onInputFocus,
        onInputKeyDown,
        openSearchPage,
        selectResult,
        setActiveIndex,
    } = useHeaderSearchBoxState({
        containerRef,
        onNavigate,
    });

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
                    onChange={onInputChange}
                    onFocus={onInputFocus}
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
                <HeaderSearchBoxDropdown
                    activeIndex={activeIndex}
                    errorMessage={errorMessage}
                    hasMinimumQuery={hasMinimumQuery}
                    results={results}
                    showNoResultsMessage={showNoResultsMessage}
                    trimmedQuery={trimmedQuery}
                    onOpenSearchPage={openSearchPage}
                    onSelectResult={selectResult}
                    onSetActiveIndex={setActiveIndex}
                />
            )}
        </div>
    );
}
