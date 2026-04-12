'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { getAgentIdentifier } from './agentOrganizationUtils';

/**
 * API endpoint used to synchronize the organization snapshot.
 *
 * @private function of AgentsList
 */
export const AGENT_ORGANIZATION_SYNC_API_PATH = '/api/agent-organization';

/**
 * Indicates whether development-only diagnostics should be emitted.
 *
 * @private function of AgentsList
 */
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/**
 * Reason labels used for organization synchronization telemetry.
 *
 * @private function of AgentsList
 */
export type AgentOrganizationSyncReason =
    | 'mount'
    | 'route-change'
    | 'window-focus'
    | 'visibility-change'
    | 'error-recovery'
    | `mutation:${string}`;

/**
 * API payload for client synchronization snapshots.
 *
 * @private function of AgentsList
 */
type AgentOrganizationSyncPayload = {
    readonly success: boolean;
    readonly agents?: ReadonlyArray<AgentOrganizationAgent>;
    readonly folders?: ReadonlyArray<AgentOrganizationFolder>;
    readonly error?: string;
    readonly syncedAt?: string;
};

/**
 * Normalized organization snapshot returned from synchronization.
 *
 * @private function of AgentsList
 */
type OrganizationSnapshot = {
    readonly agents: AgentOrganizationAgent[];
    readonly folders: AgentOrganizationFolder[];
    readonly syncedAt: string | null;
};

/**
 * Setter for the interactive local agents cache.
 *
 * @private function of AgentsList
 */
type AgentOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationAgent[]>>;

/**
 * Setter for the interactive local folders cache.
 *
 * @private function of AgentsList
 */
type FolderOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationFolder[]>>;

/**
 * Props accepted by the private synchronization state hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListSyncStateProps = {
    readonly initialAgents: AgentOrganizationAgent[];
    readonly initialFolders: AgentOrganizationFolder[];
    readonly routeSyncKey: string;
};

/**
 * Synchronization state returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListSyncStateResult = {
    readonly agents: AgentOrganizationAgent[];
    readonly folders: AgentOrganizationFolder[];
    readonly lastSyncedRouteKey: string | null;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
    readonly synchronizeOrganizationState: (
        reason: AgentOrganizationSyncReason,
        routeKeyAtSync?: string,
    ) => Promise<void>;
};

/**
 * Writes synchronization diagnostics in development builds only.
 *
 * @param message - Diagnostic message.
 * @param details - Optional structured payload for debugging.
 *
 * @private function of AgentsList
 */
export function logOrganizationSyncDebug(message: string, details?: Record<string, unknown>): void {
    if (!IS_DEVELOPMENT || typeof window === 'undefined') {
        return;
    }

    if (details) {
        console.debug(`[AgentsList sync] ${message}`, details);
        return;
    }

    console.debug(`[AgentsList sync] ${message}`);
}

/**
 * Creates a deterministic fingerprint for an organization snapshot.
 *
 * @param agents - Agents included in the snapshot.
 * @param folders - Folders included in the snapshot.
 * @returns Stable fingerprint string used to detect stale local state.
 *
 * @private function of AgentsList
 */
function createOrganizationFingerprint(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): string {
    const agentFingerprint = [...agents]
        .map(
            (agent) =>
                `${getAgentIdentifier(agent)}:${agent.agentName}:${agent.folderId ?? 'root'}:${agent.sortOrder}:${agent.visibility}`,
        )
        .sort()
        .join('|');
    const folderFingerprint = [...folders]
        .map(
            (folder) =>
                `${folder.id}:${folder.name}:${folder.parentId ?? 'root'}:${folder.sortOrder}:${folder.icon ?? ''}:${folder.color ?? ''}`,
        )
        .sort()
        .join('|');

    return `${agentFingerprint}::${folderFingerprint}`;
}

/**
 * Parses and validates the synchronization payload returned by the server.
 *
 * @param response - Fetch response for the synchronization request.
 * @param payload - Parsed JSON payload.
 * @returns Normalized snapshot ready for local state application.
 *
 * @private function of AgentsList
 */
function parseOrganizationSyncPayload(
    response: Response,
    payload: AgentOrganizationSyncPayload,
): OrganizationSnapshot {
    if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to synchronize organization state.');
    }

    if (!Array.isArray(payload.agents) || !Array.isArray(payload.folders)) {
        throw new Error('Invalid organization synchronization payload.');
    }

    return {
        agents: Array.from(payload.agents),
        folders: Array.from(payload.folders),
        syncedAt: payload.syncedAt ?? null,
    };
}

/**
 * Checks whether a synchronized snapshot differs from the current local snapshot.
 *
 * @param previousAgents - Current local agents.
 * @param previousFolders - Current local folders.
 * @param nextAgents - Incoming synchronized agents.
 * @param nextFolders - Incoming synchronized folders.
 * @returns True when the synchronized snapshot should replace local state.
 *
 * @private function of AgentsList
 */
function hasOrganizationSnapshotChanged(
    previousAgents: ReadonlyArray<AgentOrganizationAgent>,
    previousFolders: ReadonlyArray<AgentOrganizationFolder>,
    nextAgents: ReadonlyArray<AgentOrganizationAgent>,
    nextFolders: ReadonlyArray<AgentOrganizationFolder>,
): boolean {
    const previousFingerprint = createOrganizationFingerprint(previousAgents, previousFolders);
    const nextFingerprint = createOrganizationFingerprint(nextAgents, nextFolders);

    return previousFingerprint !== nextFingerprint;
}

/**
 * Owns the interactive organization caches together with their background synchronization lifecycle.
 *
 * @param props - Initial organization snapshot and route key for synchronization.
 * @returns Interactive organization state and synchronization callbacks.
 *
 * @private function of AgentsList
 */
export function useAgentsListSyncState({
    initialAgents,
    initialFolders,
    routeSyncKey,
}: UseAgentsListSyncStateProps): UseAgentsListSyncStateResult {
    const [agents, setAgents] = useState<AgentOrganizationAgent[]>(() => Array.from(initialAgents));
    const [folders, setFolders] = useState<AgentOrganizationFolder[]>(() => Array.from(initialFolders));
    const [lastSyncedRouteKey, setLastSyncedRouteKey] = useState<string | null>(null);
    const hasMountedRef = useRef(false);
    const syncAbortControllerRef = useRef<AbortController | null>(null);
    const agentsRef = useRef<AgentOrganizationAgent[]>(Array.from(initialAgents));
    const foldersRef = useRef<AgentOrganizationFolder[]>(Array.from(initialFolders));

    const synchronizeOrganizationState = useCallback(
        async (reason: AgentOrganizationSyncReason, routeKeyAtSync: string = routeSyncKey) => {
            syncAbortControllerRef.current?.abort();
            const abortController = new AbortController();
            syncAbortControllerRef.current = abortController;

            logOrganizationSyncDebug('Starting synchronization request', {
                reason,
                routeKey: routeKeyAtSync,
                previousAgentCount: agentsRef.current.length,
                previousFolderCount: foldersRef.current.length,
            });

            try {
                const response = await fetch(AGENT_ORGANIZATION_SYNC_API_PATH, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: abortController.signal,
                });
                const payload = (await response.json().catch(() => ({}))) as AgentOrganizationSyncPayload;
                const snapshot = parseOrganizationSyncPayload(response, payload);

                if (
                    hasOrganizationSnapshotChanged(
                        agentsRef.current,
                        foldersRef.current,
                        snapshot.agents,
                        snapshot.folders,
                    )
                ) {
                    logOrganizationSyncDebug('Detected stale local listing snapshot; applying synchronized data', {
                        reason,
                        routeKey: routeKeyAtSync,
                        nextAgentCount: snapshot.agents.length,
                        nextFolderCount: snapshot.folders.length,
                        syncedAt: snapshot.syncedAt,
                    });
                    setAgents(snapshot.agents);
                    setFolders(snapshot.folders);
                }

                setLastSyncedRouteKey(routeKeyAtSync);
            } catch (error) {
                if (abortController.signal.aborted) {
                    return;
                }

                logOrganizationSyncDebug('Synchronization request failed', {
                    reason,
                    routeKey: routeKeyAtSync,
                    error: error instanceof Error ? error.message : String(error),
                });
            } finally {
                if (syncAbortControllerRef.current === abortController) {
                    syncAbortControllerRef.current = null;
                }
            }
        },
        [routeSyncKey],
    );

    const synchronizeAfterMutation = useCallback(
        (mutationName: string) => {
            void synchronizeOrganizationState(`mutation:${mutationName}`);
        },
        [synchronizeOrganizationState],
    );

    // Keep the interactive agent/folder caches aligned with the latest server props (e.g., after logging in).
    useEffect(() => {
        setAgents(Array.from(initialAgents));
        setFolders(Array.from(initialFolders));
    }, [initialAgents, initialFolders]);

    /**
     * Keeps synchronization refs aligned with the latest interactive state.
     */
    useEffect(() => {
        agentsRef.current = agents;
    }, [agents]);

    /**
     * Keeps folder synchronization refs aligned with the latest interactive state.
     */
    useEffect(() => {
        foldersRef.current = folders;
    }, [folders]);

    /**
     * Synchronizes organization snapshot on initial mount and route query transitions.
     */
    useEffect(() => {
        const reason: AgentOrganizationSyncReason = hasMountedRef.current ? 'route-change' : 'mount';
        hasMountedRef.current = true;
        void synchronizeOrganizationState(reason, routeSyncKey);
    }, [routeSyncKey, synchronizeOrganizationState]);

    /**
     * Synchronizes when the tab regains focus or visibility after external updates.
     */
    useEffect(() => {
        /**
         * Handles focus-driven synchronization.
         */
        const handleWindowFocus = () => {
            void synchronizeOrganizationState('window-focus');
        };

        /**
         * Handles visibility-driven synchronization.
         */
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void synchronizeOrganizationState('visibility-change');
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [synchronizeOrganizationState]);

    /**
     * Aborts in-flight synchronization requests on unmount.
     */
    useEffect(() => {
        return () => {
            syncAbortControllerRef.current?.abort();
        };
    }, []);

    return {
        agents,
        folders,
        lastSyncedRouteKey,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
        synchronizeOrganizationState,
    };
}
