'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { HomeViewMode } from './homeViewMode';
import { updateHistorySearchParams } from './historySearchParams';
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
    const searchParams = useSearchParams();
    const pathnameSnapshot = pathname || '/';
    const searchParamsSnapshot = searchParams?.toString() || '';
    const folderQuery = searchParams?.get('folder') || null;
    const routeSyncKey = folderQuery ? `${pathnameSnapshot}?folder=${folderQuery}` : pathnameSnapshot;
    const viewMode = resolveHomeViewMode(searchParams?.get('view'));

    const setViewMode = useCallback(
        (mode: HomeViewMode) => {
            updateHistorySearchParams({
                mode: 'replace',
                pathname: pathnameSnapshot,
                searchParamsSnapshot,
                updateSearchParams: (nextSearchParams) => {
                    const viewQueryValue = getHomeViewQueryValue(mode);

                    if (viewQueryValue === null) {
                        nextSearchParams.delete('view');
                        return;
                    }

                    nextSearchParams.set('view', viewQueryValue);
                },
            });
        },
        [pathnameSnapshot, searchParamsSnapshot],
    );

    return {
        folderQuery,
        pathname: pathnameSnapshot,
        routeSyncKey,
        searchParamsSnapshot,
        setViewMode,
        viewMode,
    };
}
