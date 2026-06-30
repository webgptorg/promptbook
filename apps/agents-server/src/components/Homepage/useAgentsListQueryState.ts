'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useCurrentPathQueryNavigation } from '../_utils/useCurrentPathQueryNavigation';
import type { HomeViewMode } from './homeViewMode';
import { getHomeViewQueryValue, resolveHomeViewMode } from './homeViewMode';

/**
 * Query parameter name used to opt into showing hidden folders.
 *
 * @private function of AgentsList
 */
const HIDDEN_FOLDERS_QUERY_PARAM = 'hidden';

/**
 * Query value that opts the agents list into showing hidden folders.
 *
 * @private function of AgentsList
 */
const HIDDEN_FOLDERS_VISIBLE_QUERY_VALUE = 'show';

/**
 * Route/query state returned to the private `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListQueryStateResult = {
    readonly folderQuery: string | null;
    readonly isHiddenFoldersVisible: boolean;
    readonly routeSyncKey: string;
    readonly searchParamsSnapshot: string;
    readonly setHiddenFoldersVisible: (isVisible: boolean) => void;
    readonly setViewMode: (mode: HomeViewMode) => void;
    readonly viewMode: HomeViewMode;
    readonly updateCurrentPathQuery: ReturnType<typeof useCurrentPathQueryNavigation>;
};

/**
 * Reads the homepage route query and keeps view-mode updates localized in one place.
 *
 * @returns Route snapshot, query-derived state, and route mutation helpers.
 *
 * @private function of AgentsList
 */
export function useAgentsListQueryState(): UseAgentsListQueryStateResult {
    const searchParams = useSearchParams();
    const updateCurrentPathQuery = useCurrentPathQueryNavigation();
    const searchParamsSnapshot = searchParams?.toString() || '';
    const routeSyncKey = `?${searchParamsSnapshot}`;
    const folderQuery = searchParams?.get('folder') || null;
    const viewMode = resolveHomeViewMode(searchParams?.get('view'));
    const isHiddenFoldersVisible =
        searchParams?.get(HIDDEN_FOLDERS_QUERY_PARAM) === HIDDEN_FOLDERS_VISIBLE_QUERY_VALUE;

    const setViewMode = useCallback(
        (mode: HomeViewMode) => {
            const nextSearchParams = new URLSearchParams(searchParams?.toString() || '');
            const viewQueryValue = getHomeViewQueryValue(mode);

            if (viewQueryValue === null) {
                nextSearchParams.delete('view');
            } else {
                nextSearchParams.set('view', viewQueryValue);
            }

            updateCurrentPathQuery(nextSearchParams, 'replace');
        },
        [searchParams, updateCurrentPathQuery],
    );

    const setHiddenFoldersVisible = useCallback(
        (isVisible: boolean) => {
            const nextSearchParams = new URLSearchParams(searchParams?.toString() || '');

            if (isVisible) {
                nextSearchParams.set(HIDDEN_FOLDERS_QUERY_PARAM, HIDDEN_FOLDERS_VISIBLE_QUERY_VALUE);
            } else {
                nextSearchParams.delete(HIDDEN_FOLDERS_QUERY_PARAM);
            }

            updateCurrentPathQuery(nextSearchParams, 'replace');
        },
        [searchParams, updateCurrentPathQuery],
    );

    return {
        folderQuery,
        isHiddenFoldersVisible,
        routeSyncKey,
        searchParamsSnapshot,
        setHiddenFoldersVisible,
        setViewMode,
        viewMode,
        updateCurrentPathQuery,
    };
}
