'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { CONNECTION_TYPES, normalizeServerUrl, parseConnectionTypes, type ConnectionType } from './buildGraphData';

/**
 * Fixed view query parameter for the graph tab.
 *
 * @private function of AgentsGraph
 */
const GRAPH_VIEW_MODE = 'graph';

/**
 * Minimal search params interface used by graph URL helpers.
 *
 * @private function of AgentsGraph
 */
type SearchParamsSnapshot = Pick<URLSearchParams, 'get' | 'toString'>;

/**
 * Server/agent selection encoded in the graph URL and `<select>` control.
 *
 * @private function of AgentsGraph
 */
type AgentsGraphSelection = {
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
};

/**
 * Query-backed filter and focus state used by the private graph facade.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphQueryStateResult = {
    readonly filterType: ConnectionType[];
    readonly selectedServerUrl: string | null;
    readonly selectedAgentName: string | null;
    readonly toggleFilter: (type: ConnectionType) => void;
    readonly selectServerAndAgent: (value: string) => void;
};

/**
 * Read the initial selected server from the current URL query params.
 *
 * @private function of AgentsGraph
 */
function readInitialSelectedServerUrl(searchParams: SearchParamsSnapshot): string | null {
    const selectedServer = searchParams.get('selectedServer');

    if (!selectedServer) {
        return null;
    }

    if (selectedServer === 'ALL') {
        return 'ALL';
    }

    return normalizeServerUrl(selectedServer);
}

/**
 * Build the next graph search params from the current query string and selection state.
 *
 * @private function of AgentsGraph
 */
function buildUpdatedGraphSearchParams(
    searchParamsString: string,
    connectionTypes: ReadonlyArray<ConnectionType>,
    selectedServerUrl: string | null,
    selectedAgentName: string | null,
): URLSearchParams {
    const params = new URLSearchParams(searchParamsString);

    if (connectionTypes.length === CONNECTION_TYPES.length) {
        params.delete('connectionTypes');
    } else {
        params.set('connectionTypes', connectionTypes.join(','));
    }

    if (selectedServerUrl) {
        params.set('selectedServer', selectedServerUrl);
    } else {
        params.delete('selectedServer');
    }

    if (selectedAgentName) {
        params.set('selectedAgent', selectedAgentName);
    } else {
        params.delete('selectedAgent');
    }

    params.set('view', GRAPH_VIEW_MODE);

    return params;
}

/**
 * Decode the select-control value into a server/agent selection.
 *
 * @private function of AgentsGraph
 */
function resolveGraphSelection(value: string): AgentsGraphSelection {
    if (value === '') {
        return {
            selectedServerUrl: null,
            selectedAgentName: null,
        };
    }

    if (value === 'ALL') {
        return {
            selectedServerUrl: 'ALL',
            selectedAgentName: null,
        };
    }

    if (value.startsWith('SERVER:')) {
        return {
            selectedServerUrl: normalizeServerUrl(value.replace('SERVER:', '')),
            selectedAgentName: null,
        };
    }

    const [serverUrl, agentName] = value.split('|');

    return {
        selectedServerUrl: normalizeServerUrl(serverUrl || ''),
        selectedAgentName: agentName || null,
    };
}

/**
 * Toggle one connection type while preserving the current filter order.
 *
 * @private function of AgentsGraph
 */
function toggleConnectionType(
    connectionTypes: ReadonlyArray<ConnectionType>,
    toggledType: ConnectionType,
): ConnectionType[] {
    if (connectionTypes.includes(toggledType)) {
        return connectionTypes.filter((connectionType) => connectionType !== toggledType);
    }

    return [...connectionTypes, toggledType];
}

/**
 * Own the graph filter/query state so the public graph hook can stay focused on composition.
 *
 * @returns Query-backed filter state and update handlers for the graph toolbar.
 *
 * @private function of AgentsGraph
 */
export function useAgentsGraphQueryState(): UseAgentsGraphQueryStateResult {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filterType, setFilterType] = useState<ConnectionType[]>(
        parseConnectionTypes(searchParams?.get('connectionTypes') ?? null),
    );
    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(() =>
        readInitialSelectedServerUrl(searchParams ?? new URLSearchParams()),
    );
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
        searchParams?.get('selectedAgent') || null,
    );

    const updateUrl = useCallback(
        (
            nextFilterType: ConnectionType[],
            nextSelectedServerUrl: string | null,
            nextSelectedAgentName: string | null,
        ) => {
            const params = buildUpdatedGraphSearchParams(
                searchParams?.toString() ?? '',
                nextFilterType,
                nextSelectedServerUrl,
                nextSelectedAgentName,
            );
            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    const toggleFilter = useCallback(
        (type: ConnectionType) => {
            const nextFilterType = toggleConnectionType(filterType, type);
            setFilterType(nextFilterType);
            updateUrl(nextFilterType, selectedServerUrl, selectedAgentName);
        },
        [filterType, selectedAgentName, selectedServerUrl, updateUrl],
    );

    const selectServerAndAgent = useCallback(
        (value: string) => {
            const nextSelection = resolveGraphSelection(value);
            setSelectedServerUrl(nextSelection.selectedServerUrl);
            setSelectedAgentName(nextSelection.selectedAgentName);
            updateUrl(filterType, nextSelection.selectedServerUrl, nextSelection.selectedAgentName);
        },
        [filterType, updateUrl],
    );

    return {
        filterType,
        selectedServerUrl,
        selectedAgentName,
        toggleFilter,
        selectServerAndAgent,
    };
}
