'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { HomeViewMode } from './homeViewMode';
import { getHomeViewQueryValue, resolveHomeViewMode } from './homeViewMode';

/**
 * Route/query state returned to the private `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListQueryStateResult = {
    readonly folderQuery: string | null;
    readonly pathname: string;
    readonly routeSyncKey: string;
    readonly router: ReturnType<typeof useRouter>;
    readonly searchParamsSnapshot: string;
    readonly setViewMode: (mode: HomeViewMode) => void;
    readonly viewMode: HomeViewMode;
};

/**
 * Reads the homepage route query and keeps view-mode updates localized in one place.
 *
 * @returns Route snapshot, query-derived state, and route mutation helpers.
 *
 * @private function of AgentsList
 */
export function useAgentsListQueryState(): UseAgentsListQueryStateResult {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathnameSnapshot = pathname || '/';
    const searchParamsSnapshot = searchParams?.toString() || '';
    const routeSyncKey = `${pathnameSnapshot}?${searchParamsSnapshot}`;
    const folderQuery = searchParams?.get('folder') || null;
    const viewMode = resolveHomeViewMode(searchParams?.get('view'));

    const setViewMode = useCallback(
        (mode: HomeViewMode) => {
            const nextSearchParams = new URLSearchParams(searchParams?.toString() || '');
            const viewQueryValue = getHomeViewQueryValue(mode);

            if (viewQueryValue === null) {
                nextSearchParams.delete('view');
            } else {
                nextSearchParams.set('view', viewQueryValue);
            }

            router.replace(`?${nextSearchParams.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    return {
        folderQuery,
        pathname: pathnameSnapshot,
        routeSyncKey,
        router,
        searchParamsSnapshot,
        setViewMode,
        viewMode,
    };
}
