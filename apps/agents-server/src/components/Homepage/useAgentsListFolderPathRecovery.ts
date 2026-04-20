'use client';

import { useEffect } from 'react';
import type { CurrentPathQueryNavigationMode } from '../_utils/useCurrentPathQueryNavigation';
import { logOrganizationSyncDebug } from './useAgentsListSyncState';

/**
 * Props accepted by the stale-folder-path recovery hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderPathRecoveryProps = {
    readonly currentFolderId: number | null;
    readonly folderPathSegments: ReadonlyArray<string>;
    readonly lastSyncedRouteKey: string | null;
    readonly folderQuery: string | null;
    readonly routeSyncKey: string;
    readonly searchParamsSnapshot: string;
    readonly updateCurrentPathQuery: (nextQuery: URLSearchParams, mode?: CurrentPathQueryNavigationMode) => void;
};

/**
 * Normalizes stale folder URLs after synchronization invalidates the current folder path.
 *
 * @param props - Route state needed to repair an invalid folder query.
 *
 * @private function of AgentsList
 */
export function useAgentsListFolderPathRecovery({
    currentFolderId,
    folderPathSegments,
    lastSyncedRouteKey,
    folderQuery,
    routeSyncKey,
    searchParamsSnapshot,
    updateCurrentPathQuery,
}: UseAgentsListFolderPathRecoveryProps): void {
    useEffect(() => {
        if (folderPathSegments.length === 0 || currentFolderId !== null) {
            return;
        }

        if (lastSyncedRouteKey !== routeSyncKey) {
            return;
        }

        const params = new URLSearchParams(searchParamsSnapshot);
        params.delete('folder');
        const nextQuery = params.toString();

        logOrganizationSyncDebug('Folder path no longer resolves; normalizing URL to the nearest valid scope', {
            routeKey: routeSyncKey,
            previousFolderPath: folderQuery,
            nextQuery: nextQuery || null,
        });

        updateCurrentPathQuery(params, 'replace');
    }, [
        currentFolderId,
        folderPathSegments,
        folderQuery,
        lastSyncedRouteKey,
        routeSyncKey,
        searchParamsSnapshot,
        updateCurrentPathQuery,
    ]);
}
