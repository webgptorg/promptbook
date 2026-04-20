'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

/**
 * History mode used when updating the current route query string.
 *
 * @private utility of Agents Server client-side query navigation
 */
export type CurrentPathQueryNavigationMode = 'push' | 'replace';

/**
 * Query input accepted by the current-path query navigation helper.
 *
 * @private utility of Agents Server client-side query navigation
 */
type CurrentPathQueryInput = URLSearchParams | string;

/**
 * Applies one immediate query-string update to the current pathname via the browser history API.
 *
 * @returns Callback that updates the current pathname query string without waiting for a server navigation.
 *
 * @private utility of Agents Server client-side query navigation
 */
export function useCurrentPathQueryNavigation() {
    const pathname = usePathname() || '/';

    return useCallback((nextQueryInput: CurrentPathQueryInput, mode: CurrentPathQueryNavigationMode = 'push') => {
        const nextQuery = typeof nextQueryInput === 'string' ? nextQueryInput : nextQueryInput.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

        if (mode === 'replace') {
            window.history.replaceState(null, '', nextUrl);
            return;
        }

        window.history.pushState(null, '', nextUrl);
    }, [pathname]);
}
