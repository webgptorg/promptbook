// Client Component for rendering and deleting agents
'use client';

import {
    DndContext,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { TODO_any, string_url } from '@promptbook-local/types';
import { FolderPlusIcon, Grid, Network, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AddAgentButton } from '../../app/AddAgentButton';
import type { AgentProfile } from '../../app/agents/[agentName]/AgentProfileWrapper';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '../../utils/agentOrganization/folderAppearance';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import { AgentContextMenuPopover, type AgentContextMenuRenamePayload } from '../AgentContextMenu/AgentContextMenu';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showConfirm, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import { FolderContextMenuPopover } from '../FolderContextMenu/FolderContextMenu';
import { AgentCard } from './AgentCard';
import { AgentQrCodeModal } from './AgentQrCodeModal';
import {
    buildFolderMaps,
    buildFolderPath,
    collectDescendantFolderIds,
    getFolderPathSegments,
    parseFolderPath,
    pickPreviewAgents,
    resolveFolderIdFromPath,
    sortBySortOrder,
} from './agentOrganizationUtils';
import { AgentsGraph } from './AgentsGraph';
import { BreadcrumbDropTarget } from './BreadcrumbDropTarget';
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';
import { FolderCard } from './FolderCard';
import { FolderEditDialog, type FolderEditValues } from './FolderEditDialog';
import { getDropIntentFromRects } from './getDropIntentFromRects';
import { HOMEPAGE_AGENT_GRID_CLASS } from './gridLayout';
import { ParentFolderCard } from './ParentFolderCard';
import { SortableAgentCard } from './SortableAgentCard';
import { SortableFolderCard } from './SortableFolderCard';
import type { BreadcrumbDropTargetData } from './useBreadcrumbDropTarget';
import { useFederatedAgents, type AgentWithVisibility } from './useFederatedAgents';
import { useIsTouchInput } from './useIsTouchInput';

/**
 * State for the agent context menu.
 */
type AgentContextMenuState = {
    /**
     * Agent currently associated with the context menu.
     */
    readonly agent: AgentOrganizationAgent;
    /**
     * Cursor position for the menu anchor.
     */
    readonly anchorPoint: { x: number; y: number };
};

/**
 * State for the folder context menu.
 */
type FolderContextMenuState = {
    /**
     * Folder id currently associated with the context menu.
     */
    readonly folderId: number;
    /**
     * Cursor position for the menu anchor.
     */
    readonly anchorPoint: { x: number; y: number };
};

/**
 * State for create/edit folder dialog interactions.
 */
type FolderEditDialogState = {
    /**
     * Dialog mode determining create vs edit behavior.
     */
    readonly mode: 'CREATE' | 'EDIT';
    /**
     * Edited folder id in edit mode, null in create mode.
     */
    readonly folderId: number | null;
    /**
     * Initial values shown in the editor.
     */
    readonly initialValues: FolderEditValues;
};

const AGENT_DRAG_ID_PREFIX = 'agent:';
const FOLDER_DRAG_ID_PREFIX = 'folder:';
const DRAG_START_DISTANCE_PX = 8;
const TOUCH_DRAG_DELAY_MS = 250;
const TOUCH_DRAG_TOLERANCE_PX = 6;
/**
 * API endpoint used to synchronize the organization snapshot.
 */
const AGENT_ORGANIZATION_SYNC_API_PATH = '/api/agent-organization';
/**
 * Indicates whether development-only diagnostics should be emitted.
 */
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/**
 * Reasons used for organization synchronization telemetry.
 */
type AgentOrganizationSyncReason =
    | 'mount'
    | 'route-change'
    | 'window-focus'
    | 'visibility-change'
    | 'error-recovery'
    | `mutation:${string}`;

/**
 * API payload for client synchronization snapshots.
 */
type AgentOrganizationSyncPayload = {
    /**
     * Indicates whether the snapshot fetch succeeded.
     */
    readonly success: boolean;
    /**
     * Latest active agents for the current user scope.
     */
    readonly agents?: ReadonlyArray<AgentOrganizationAgent>;
    /**
     * Latest active folders for the current user scope.
     */
    readonly folders?: ReadonlyArray<AgentOrganizationFolder>;
    /**
     * Optional error message when sync fails.
     */
    readonly error?: string;
    /**
     * Server timestamp indicating snapshot freshness.
     */
    readonly syncedAt?: string;
};

/**
 * Writes synchronization diagnostics in development builds only.
 *
 * @param message - Diagnostic message.
 * @param details - Optional structured payload for debugging.
 */
function logOrganizationSyncDebug(message: string, details?: Record<string, unknown>): void {
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
 */
function createOrganizationFingerprint(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): string {
    const agentFingerprint = [...agents]
        .map(
            (agent) =>
                `${agent.permanentId || agent.agentName}:${agent.agentName}:${agent.folderId ?? 'root'}:${agent.sortOrder}:${agent.visibility}`,
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
 * Builds a unique drag identifier with a stable prefix.
 *
 * @param prefix - Prefix describing the drag item type.
 * @param identifier - Unique identifier for the item.
 * @returns Stable drag identifier string.
 */
const buildDragId = (prefix: string, identifier: string) => `${prefix}${identifier}`;

/**
 * Builds a drag identifier for an agent.
 *
 * @param identifier - Agent identifier.
 * @returns Drag identifier string.
 */
const getAgentDragId = (identifier: string) => buildDragId(AGENT_DRAG_ID_PREFIX, identifier);

/**
 * Builds a drag identifier for a folder.
 *
 * @param folderId - Folder id to encode.
 * @returns Drag identifier string.
 */
const getFolderDragId = (folderId: number) => buildDragId(FOLDER_DRAG_ID_PREFIX, String(folderId));

/**
 * Props for the agents list component.
 */
type AgentsListProps = {
    /**
     * List of agents to display, each with basic information and visibility status
     */
    readonly agents: AgentOrganizationAgent[];

    /**
     * List of folders to display in the hierarchy
     */
    readonly folders: AgentOrganizationFolder[];

    /**
     * Indicates if the current user has administrative privileges for managing agents
     */
    readonly isAdmin: boolean;

    /**
     * Indicates if the current user can organize agents and folders
     */
    readonly canOrganize: boolean;

    /**
     * Controls whether federated agents are loaded and shown in graph view.
     */
    readonly showFederatedAgents: boolean;

    /**
     * Base URL of the agents server
     *
     * Note: [??] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;

    /**
     * Optional external agents to display in the list view (used for federated agents)
     */
    readonly externalAgents?: AgentWithVisibility[];

    /**
     * Whether the current view is inside a subfolder.
     */
    readonly isSubfolderView: boolean;
};

/**
 * Renders the agents list with folder navigation and graph view toggles.
 */
export function AgentsList(props: AgentsListProps) {
    const {
        agents: initialAgents,
        folders: initialFolders,
        isAdmin,
        canOrganize,
        publicUrl,
        showFederatedAgents,
        externalAgents: initialExternalAgents,
    } = props;
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsSnapshot = searchParams.toString();
    const routeSyncKey = `${pathname}?${searchParamsSnapshot}`;
    const folderQuery = searchParams.get('folder');
    const [agents, setAgents] = useState<AgentOrganizationAgent[]>(Array.from(initialAgents));
    const [folders, setFolders] = useState<AgentOrganizationFolder[]>(Array.from(initialFolders));
    const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
    const [contextMenuState, setContextMenuState] = useState<AgentContextMenuState | null>(null);
    const [folderContextMenuState, setFolderContextMenuState] = useState<FolderContextMenuState | null>(null);
    const [folderEditDialogState, setFolderEditDialogState] = useState<FolderEditDialogState | null>(null);
    const [isFolderEditSubmitting, setIsFolderEditSubmitting] = useState<boolean>(false);
    const [qrCodeAgent, setQrCodeAgent] = useState<AgentOrganizationAgent | null>(null);
    const [lastSyncedRouteKey, setLastSyncedRouteKey] = useState<string | null>(null);
    const { formatText } = useAgentNaming();
    const hasMountedRef = useRef(false);
    const syncAbortControllerRef = useRef<AbortController | null>(null);
    const agentsRef = useRef<Array<AgentOrganizationAgent>>(Array.from(initialAgents));
    const foldersRef = useRef<Array<AgentOrganizationFolder>>(Array.from(initialFolders));

    /**
     * Runs a background synchronization against the canonical organization snapshot.
     *
     * @param reason - Synchronization trigger reason.
     * @param routeKeyAtSync - Route key associated with this request.
     */
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
                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || 'Failed to synchronize organization state.');
                }

                if (!Array.isArray(payload.agents) || !Array.isArray(payload.folders)) {
                    throw new Error('Invalid organization synchronization payload.');
                }

                const nextAgents = Array.from(payload.agents);
                const nextFolders = Array.from(payload.folders);
                const previousFingerprint = createOrganizationFingerprint(agentsRef.current, foldersRef.current);
                const nextFingerprint = createOrganizationFingerprint(nextAgents, nextFolders);

                if (previousFingerprint !== nextFingerprint) {
                    logOrganizationSyncDebug('Detected stale local listing snapshot; applying synchronized data', {
                        reason,
                        routeKey: routeKeyAtSync,
                        nextAgentCount: nextAgents.length,
                        nextFolderCount: nextFolders.length,
                        syncedAt: payload.syncedAt ?? null,
                    });
                    setAgents(nextAgents);
                    setFolders(nextFolders);
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

    /**
     * Requests a post-mutation background synchronization without blocking UI interactions.
     *
     * @param mutationName - Mutation label included in diagnostics.
     */
    const synchronizeAfterMutation = useCallback(
        (mutationName: string) => {
            void synchronizeOrganizationState(`mutation:${mutationName}`);
        },
        [synchronizeOrganizationState],
    );

    const normalizedPublicUrl = useMemo(() => (publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`), [publicUrl]);
    const publicUrlHost = useMemo(() => {
        try {
            return new URL(normalizedPublicUrl).hostname;
        } catch (error) {
            return '';
        }
    }, [normalizedPublicUrl]);

    const viewMode = searchParams.get('view') === 'graph' ? 'GRAPH' : 'LIST';
    const showFederatedAgentsInGraph = showFederatedAgents && viewMode === 'GRAPH';
    const { federatedAgents, federatedServersStatus } = useFederatedAgents(
        showFederatedAgents,
        initialExternalAgents,
        showFederatedAgentsInGraph,
    );
    const isTouchInput = useIsTouchInput();
    const allowFullCardDrag = canOrganize && viewMode === 'LIST' && !isTouchInput;
    const folderPathSegments = parseFolderPath(folderQuery);
    const currentFolderId = useMemo(
        () => resolveFolderIdFromPath(folders, folderPathSegments),
        [folders, folderPathSegments],
    );
    const folderMaps = useMemo(() => buildFolderMaps(folders), [folders]);
    const breadcrumbFolders = useMemo(
        () => getFolderPathSegments(currentFolderId, folderMaps.folderById),
        [currentFolderId, folderMaps.folderById],
    );
    const parentFolderInfo = useMemo(() => {
        if (currentFolderId === null) {
            return null;
        }
        const currentFolder = folderMaps.folderById.get(currentFolderId);
        const parentFolderId = currentFolder?.parentId ?? null;
        const parentFolderName =
            parentFolderId === null
                ? formatText('All Agents')
                : folderMaps.folderById.get(parentFolderId)?.name || formatText('All Agents');
        return { id: parentFolderId, label: parentFolderName };
    }, [currentFolderId, folderMaps, formatText]);

    const visibleFolders = useMemo(
        () =>
            sortBySortOrder(
                folders.filter((folder) => (folder.parentId ?? null) === (currentFolderId ?? null)),
                (folder) => folder.name,
            ),
        [folders, currentFolderId],
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

    /**
     * Normalizes stale folder URLs that no longer resolve after synchronization.
     */
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

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [
        currentFolderId,
        folderPathSegments,
        lastSyncedRouteKey,
        folderQuery,
        pathname,
        routeSyncKey,
        router,
        searchParamsSnapshot,
    ]);

    const visibleAgents = useMemo(
        () =>
            sortBySortOrder(
                agents.filter((agent) => (agent.folderId ?? null) === (currentFolderId ?? null)),
                (agent) => agent.agentName,
            ),
        [agents, currentFolderId],
    );

    const agentCount = viewMode === 'LIST' ? visibleAgents.length : agents.length;
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: DRAG_START_DISTANCE_PX },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
        }),
    );
    const visibleFolderDragIds = useMemo(
        () => visibleFolders.map((folder) => getFolderDragId(folder.id)),
        [visibleFolders],
    );
    const visibleAgentDragIds = useMemo(
        () => visibleAgents.map((agent) => getAgentDragId(agent.permanentId || agent.agentName)),
        [visibleAgents],
    );
    const activeAgent = useMemo(() => {
        if (activeDragItem?.type !== 'AGENT') {
            return null;
        }
        return agents.find((agent) => (agent.permanentId || agent.agentName) === activeDragItem.identifier) || null;
    }, [activeDragItem, agents]);
    const activeFolder = useMemo(() => {
        if (activeDragItem?.type !== 'FOLDER') {
            return null;
        }
        return folders.find((folder) => String(folder.id) === activeDragItem.identifier) || null;
    }, [activeDragItem, folders]);

    /**
     * Builds a full agent URL from a list identifier.
     *
     * @param identifier - Agent identifier used in list URLs.
     * @returns Fully qualified URL for the agent.
     */
    const buildAgentUrl = useCallback(
        (identifier: string) => `${normalizedPublicUrl}${encodeURIComponent(identifier)}`,
        [normalizedPublicUrl],
    );

    /**
     * Builds a stable agent email from an identifier.
     *
     * @param identifier - Agent identifier used for the email alias.
     * @returns Agent email string.
     */
    const buildAgentEmail = useCallback(
        (identifier: string) => (publicUrlHost ? `${identifier}@${publicUrlHost}` : ''),
        [publicUrlHost],
    );

    /**
     * Updates the view mode query param.
     *
     * @param mode - Next view mode.
     */
    const setViewMode = (mode: 'LIST' | 'GRAPH') => {
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'LIST') {
            params.delete('view');
        } else {
            params.set('view', 'graph');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    /**
     * Updates the folder query param for navigation.
     *
     * @param folderId - Folder to navigate into.
     * @param overrideFolders - Optional folder list to use for path building.
     */
    const navigateToFolder = (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => {
        const targetFolders = overrideFolders || folders;
        const { folderById } = buildFolderMaps(targetFolders);
        const targetSegments = getFolderPathSegments(folderId, folderById).map((folder) => folder.name);
        const params = new URLSearchParams(searchParams.toString());

        if (targetSegments.length === 0) {
            params.delete('folder');
        } else {
            params.set('folder', buildFolderPath(targetSegments));
        }

        router.push(`?${params.toString()}`, { scroll: false });
    };

    /**
     * Persists organization updates to the server.
     *
     * @param payload - Update payload with folder and agent updates.
     */
    const persistOrganizationUpdates = async (payload: AgentOrganizationUpdatePayload) => {
        const response = await fetch('/api/agent-organization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const responseBody = await response.json().catch(() => ({}));
            throw new Error(responseBody.error || 'Failed to update organization.');
        }

        synchronizeAfterMutation('organization-update');
    };

    /**
     * Moves an item within an array.
     *
     * @param items - Items to reorder.
     * @param fromIndex - Source index.
     * @param toIndex - Target index.
     * @returns Reordered array copy.
     */
    const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
        const updated = [...items];
        const [moved] = updated.splice(fromIndex, 1);
        const clampedIndex = Math.max(0, Math.min(updated.length, toIndex));
        updated.splice(clampedIndex, 0, moved);
        return updated;
    };

    /**
     * Reorders folders within the current parent folder.
     *
     * @param draggedId - Folder id being moved.
     * @param targetId - Target folder id.
     */
    const reorderFolders = async (draggedId: number, targetId: number) => {
        const ordered = visibleFolders.map((folder) => folder.id);
        const fromIndex = ordered.indexOf(draggedId);
        const targetIndex = ordered.indexOf(targetId);
        if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
            return;
        }

        const nextOrder = moveItem(ordered, fromIndex, targetIndex);
        const updatedFolders = nextOrder.map((id, index) => {
            const folder = folders.find((item) => item.id === id);
            return folder ? { ...folder, sortOrder: index } : null;
        });

        const updates = updatedFolders.filter(Boolean) as AgentOrganizationFolder[];
        const updatedMap = new Map(updates.map((folder) => [folder.id, folder]));

        setFolders((prev) => prev.map((folder) => updatedMap.get(folder.id) || folder));
        await persistOrganizationUpdates({
            folders: updates.map((folder) => ({
                id: folder.id,
                parentId: folder.parentId ?? null,
                sortOrder: folder.sortOrder,
            })),
        });
    };

    /**
     * Reorders agents within the current folder.
     *
     * @param draggedId - Agent identifier being moved.
     * @param targetId - Target agent identifier.
     */
    const reorderAgents = async (draggedId: string, targetId: string) => {
        const ordered = visibleAgents.map((agent) => agent.permanentId || agent.agentName);
        const fromIndex = ordered.indexOf(draggedId);
        const targetIndex = ordered.indexOf(targetId);
        if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
            return;
        }

        const nextOrder = moveItem(ordered, fromIndex, targetIndex);
        const updates = nextOrder
            .map((identifier, index) => {
                const agent = agents.find((item) => (item.permanentId || item.agentName) === identifier);
                return agent ? { ...agent, sortOrder: index } : null;
            })
            .filter(Boolean) as AgentOrganizationAgent[];

        const updatedMap = new Map(updates.map((agent) => [(agent.permanentId || agent.agentName)!, agent]));
        setAgents((prev) => prev.map((agent) => updatedMap.get(agent.permanentId || agent.agentName) || agent));

        await persistOrganizationUpdates({
            agents: updates.map((agent) => ({
                identifier: agent.permanentId || agent.agentName,
                folderId: agent.folderId ?? null,
                sortOrder: agent.sortOrder,
            })),
        });
    };

    /**
     * Moves a folder into another folder or the root.
     *
     * @param folderId - Folder id to move.
     * @param targetParentId - Target parent folder id.
     */
    const moveFolderToParent = async (folderId: number, targetParentId: number | null) => {
        if (folderId === targetParentId) {
            return;
        }

        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }

        const descendantIds = collectDescendantFolderIds(folderId, folderMaps.childrenByParentId);
        if (targetParentId !== null && descendantIds.includes(targetParentId)) {
            await showAlert({
                title: 'Invalid move',
                message: 'Cannot move a folder into one of its subfolders.',
            }).catch(() => undefined);
            return;
        }

        const sourceParentId = folder.parentId ?? null;
        const sourceSiblings = sortBySortOrder(
            folders.filter((item) => (item.parentId ?? null) === sourceParentId && item.id !== folderId),
            (item) => item.name,
        );
        const targetSiblings = sortBySortOrder(
            folders.filter((item) => (item.parentId ?? null) === (targetParentId ?? null) && item.id !== folderId),
            (item) => item.name,
        );

        const nextSortOrder = targetSiblings.length > 0 ? targetSiblings[targetSiblings.length - 1].sortOrder + 1 : 0;
        const updatedFolder = { ...folder, parentId: targetParentId, sortOrder: nextSortOrder };

        const updates: AgentOrganizationFolder[] = [
            ...sourceSiblings.map((item, index) => ({ ...item, sortOrder: index })),
            updatedFolder,
        ];

        const updatedMap = new Map(updates.map((item) => [item.id, item]));
        setFolders((prev) => prev.map((item) => updatedMap.get(item.id) || item));

        await persistOrganizationUpdates({
            folders: updates.map((item) => ({
                id: item.id,
                parentId: item.parentId ?? null,
                sortOrder: item.sortOrder,
            })),
        });
    };

    /**
     * Moves an agent into another folder or the root.
     *
     * @param identifier - Agent identifier to move.
     * @param targetFolderId - Target folder id.
     */
    const moveAgentToFolder = async (identifier: string, targetFolderId: number | null) => {
        const agent = agents.find((item) => (item.permanentId || item.agentName) === identifier);
        if (!agent) {
            return;
        }

        const sourceFolderId = agent.folderId ?? null;
        if (sourceFolderId === targetFolderId) {
            return;
        }

        const sourceAgents = sortBySortOrder(
            agents.filter(
                (item) =>
                    (item.folderId ?? null) === sourceFolderId && (item.permanentId || item.agentName) !== identifier,
            ),
            (item) => item.agentName,
        );
        const targetAgents = sortBySortOrder(
            agents.filter((item) => (item.folderId ?? null) === targetFolderId),
            (item) => item.agentName,
        );

        const nextSortOrder = targetAgents.length > 0 ? targetAgents[targetAgents.length - 1].sortOrder + 1 : 0;
        const updatedAgent = { ...agent, folderId: targetFolderId, sortOrder: nextSortOrder };

        const updates: AgentOrganizationAgent[] = [
            ...sourceAgents.map((item, index) => ({ ...item, sortOrder: index })),
            updatedAgent,
        ];

        const updatedMap = new Map(updates.map((item) => [(item.permanentId || item.agentName)!, item]));
        setAgents((prev) => prev.map((item) => updatedMap.get(item.permanentId || agent.agentName) || item));

        await persistOrganizationUpdates({
            agents: updates.map((agent) => ({
                identifier: agent.permanentId || agent.agentName,
                folderId: agent.folderId ?? null,
                sortOrder: agent.sortOrder,
            })),
        });
    };

    /**
     * Validates a folder name before create/edit actions.
     *
     * @param name - Folder name to validate.
     * @returns Error message for invalid names, otherwise null.
     */
    const validateFolderName = (name: string): string | null => {
        if (!name) {
            return 'Folder name cannot be empty.';
        }
        if (name.includes('/')) {
            return 'Folder name cannot include "/".';
        }
        return null;
    };

    /**
     * Opens the create-folder dialog with defaults.
     */
    const handleCreateFolder = () => {
        setFolderEditDialogState({
            mode: 'CREATE',
            folderId: null,
            initialValues: {
                name: '',
                icon: DEFAULT_FOLDER_ICON,
                color: DEFAULT_FOLDER_COLOR,
            },
        });
    };

    /**
     * Opens the edit-folder dialog for one folder.
     *
     * @param folderId - Folder id to edit.
     */
    const handleRenameFolder = (folderId: number) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }
        setFolderEditDialogState({
            mode: 'EDIT',
            folderId,
            initialValues: {
                name: folder.name,
                icon: folder.icon ?? DEFAULT_FOLDER_ICON,
                color: folder.color ?? DEFAULT_FOLDER_COLOR,
            },
        });
    };

    /**
     * Applies folder create/edit changes submitted from the dialog.
     *
     * @param values - Folder values submitted by the dialog.
     */
    const handleSubmitFolderEdit = async (values: FolderEditValues) => {
        if (!folderEditDialogState) {
            return;
        }

        const trimmedName = values.name.trim();
        const nameError = validateFolderName(trimmedName);
        if (nameError) {
            await showAlert({
                title: 'Invalid name',
                message: nameError,
            }).catch(() => undefined);
            return;
        }

        setIsFolderEditSubmitting(true);
        try {
            if (folderEditDialogState.mode === 'CREATE') {
                const response = await fetch('/api/agent-folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: trimmedName,
                        parentId: currentFolderId ?? null,
                        icon: values.icon,
                        color: values.color,
                    }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create folder.');
                }
                setFolders((prev) => [...prev, data.folder as AgentOrganizationFolder]);
                synchronizeAfterMutation('create-folder');
                setFolderEditDialogState(null);
                return;
            }

            const folderId = folderEditDialogState.folderId;
            if (folderId === null) {
                return;
            }

            const response = await fetch(`/api/agent-folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: trimmedName,
                    icon: values.icon,
                    color: values.color,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update folder.');
            }

            const updatedFolder = data.folder as AgentOrganizationFolder;
            const nextFolders = folders.map((item) => (item.id === folderId ? { ...item, ...updatedFolder } : item));
            setFolders(nextFolders);
            synchronizeAfterMutation('rename-folder');
            if (breadcrumbFolders.some((item) => item.id === folderId)) {
                navigateToFolder(currentFolderId ?? null, nextFolders);
            }
            setFolderEditDialogState(null);
        } catch (error) {
            await showAlert({
                title: folderEditDialogState.mode === 'CREATE' ? 'Create failed' : 'Update failed',
                message: error instanceof Error ? error.message : 'Failed to update folder.',
            }).catch(() => undefined);
        } finally {
            setIsFolderEditSubmitting(false);
        }
    };

    /**
     * Closes the folder editor dialog when no submit is in progress.
     */
    const handleCloseFolderEditDialog = useCallback(() => {
        if (isFolderEditSubmitting) {
            return;
        }
        setFolderEditDialogState(null);
    }, [isFolderEditSubmitting]);

    /**
     * Deletes a folder and moves its contents to the recycle bin.
     *
     * @param folderId - Folder id to delete.
     */
    const handleDeleteFolder = async (folderId: number) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }

        const descendantIds = collectDescendantFolderIds(folderId, folderMaps.childrenByParentId);
        const descendantSet = new Set(descendantIds);
        const subfolderCount = descendantIds.length - 1;
        const agentCount = agents.filter(
            (agent) => agent.folderId !== null && descendantSet.has(agent.folderId),
        ).length;

        const confirmed = await showConfirm({
            title: 'Delete folder',
            message: `${formatText('Delete folder')} "${folder.name}"? ${formatText(
                'It will move',
            )} ${agentCount} ${formatText('agents')} and ${subfolderCount} subfolders to the Recycle Bin.`,
            confirmLabel: 'Delete folder',
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/agent-folders/${folderId}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete folder.');
            }

            setFolders((prev) => prev.filter((item) => !descendantSet.has(item.id)));
            setAgents((prev) => prev.filter((agent) => agent.folderId === null || !descendantSet.has(agent.folderId)));
            synchronizeAfterMutation('delete-folder');

            if (currentFolderId !== null && descendantSet.has(currentFolderId)) {
                navigateToFolder(null);
            }
        } catch (error) {
            await showAlert({
                title: 'Delete failed',
                message: error instanceof Error ? error.message : 'Failed to delete folder.',
            }).catch(() => undefined);
        }
    };

    /**
     * Deletes an agent by moving it to the recycle bin.
     *
     * @param agentIdentifier - Agent identifier to delete.
     */
    const handleDelete = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        const confirmed = await showConfirm({
            title: formatText('Delete agent'),
            message: `${formatText('Delete agent')} "${agent.agentName}"? ${formatText(
                'It will be moved to Recycle Bin.',
            )}`,
            confirmLabel: formatText('Delete agent'),
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
            if (response.ok) {
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
                synchronizeAfterMutation('delete-agent');
            } else {
                await showAlert({
                    title: 'Delete failed',
                    message: formatText('Failed to delete agent'),
                }).catch(() => undefined);
            }
        } catch (error) {
            await showAlert({
                title: 'Delete failed',
                message: formatText('Failed to delete agent'),
            }).catch(() => undefined);
        }
    };

    /**
     * Prompts to update visibility for the selected folder subtree.
     *
     * @param folderId - Folder id used for the visibility selection.
     */
    const handleRequestFolderVisibilityUpdate = async (folderId: number) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }

        const descendantIds = collectDescendantFolderIds(folderId, folderMaps.childrenByParentId);
        const descendantSet = new Set(descendantIds);
        const affectedAgents = agents.filter((agent) => agent.folderId !== null && descendantSet.has(agent.folderId));

        const selectedVisibility = await showVisibilityDialog({
            title: 'Update visibility',
            description: `${formatText('Set visibility for folder')} "${folder.name}" ${formatText(
                'and its subtree',
            )}. ${formatText('Affected agents')}: ${affectedAgents.length}.`,
            confirmLabel: 'Update visibility',
            initialVisibility: DEFAULT_AGENT_VISIBILITY,
        }).catch(() => null);
        if (!selectedVisibility) {
            return;
        }

        await handleSetFolderVisibility(folderId, selectedVisibility);
    };

    /**
     * Requests a new visibility for an agent via the selection dialog and applies it.
     *
     * @param agentIdentifier - Agent identifier to update.
     */
    const handleRequestAgentVisibilityChange = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) {
            return;
        }

        const selectedVisibility = await showVisibilityDialog({
            title: 'Update visibility',
            description: `${formatText('Set visibility for agent')} "${agent.agentName}".`,
            confirmLabel: 'Update visibility',
            initialVisibility: agent.visibility ?? DEFAULT_AGENT_VISIBILITY,
        }).catch(() => null);
        if (!selectedVisibility || selectedVisibility === agent.visibility) {
            return;
        }

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility: selectedVisibility }),
            });

            if (response.ok) {
                setAgents((prev) =>
                    prev.map((a) =>
                        a.permanentId === agent.permanentId || a.agentName === agent.agentName
                            ? { ...a, visibility: selectedVisibility }
                            : a,
                    ),
                );
                synchronizeAfterMutation('update-agent-visibility');
            } else {
                await showAlert({
                    title: 'Update failed',
                    message: formatText('Failed to update agent visibility'),
                }).catch(() => undefined);
            }
        } catch (error) {
            await showAlert({
                title: 'Update failed',
                message: formatText('Failed to update agent visibility'),
            }).catch(() => undefined);
        }
    };

    /**
     * Applies visibility to all agents inside the selected folder subtree.
     *
     * @param folderId - Root folder id for the batch update.
     * @param visibility - Visibility to apply.
     */
    const handleSetFolderVisibility = async (folderId: number, visibility: AgentVisibility) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }

        const descendantIds = collectDescendantFolderIds(folderId, folderMaps.childrenByParentId);
        const descendantSet = new Set(descendantIds);

        try {
            const response = await fetch(`/api/agent-folders/${folderId}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility }),
            });
            const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update folder visibility.');
            }

            setAgents((prev) =>
                prev.map((agent) =>
                    agent.folderId !== null && descendantSet.has(agent.folderId)
                        ? { ...agent, visibility }
                        : agent,
                ),
            );
            synchronizeAfterMutation('update-folder-visibility');
        } catch (error) {
            await showAlert({
                title: 'Update failed',
                message: error instanceof Error ? error.message : 'Failed to update folder visibility.',
            }).catch(() => undefined);
        }
    };

    /**
     * Opens the agent context menu at the cursor position.
     *
     * @param event - Mouse event that triggered the context menu.
     * @param agent - Agent to show in the context menu.
     */
    const handleAgentContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => {
        event.preventDefault();
        setFolderContextMenuState(null);
        setContextMenuState({ agent, anchorPoint: { x: event.clientX, y: event.clientY } });
    }, []);

    /**
     * Closes the agent context menu.
     */
    const handleCloseContextMenu = useCallback(() => {
        setContextMenuState(null);
    }, []);

    /**
     * Opens the folder context menu at the cursor position.
     *
     * @param event - Mouse event that triggered the context menu.
     * @param folder - Folder to show in the context menu.
     */
    const handleFolderContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => {
        event.preventDefault();
        setContextMenuState(null);
        setFolderContextMenuState({ folderId: folder.id, anchorPoint: { x: event.clientX, y: event.clientY } });
    }, []);

    /**
     * Closes the folder context menu.
     */
    const handleCloseFolderContextMenu = useCallback(() => {
        setFolderContextMenuState(null);
    }, []);

    /**
     * Updates agent state after a rename action.
     *
     * @param payload - Rename payload from the context menu.
     */
    const handleContextMenuAgentRenamed = useCallback((payload: AgentContextMenuRenamePayload) => {
        setAgents((prev) =>
            prev.map((agent) => {
                const identifier = agent.permanentId || agent.agentName;
                if (identifier !== payload.previousIdentifier) {
                    return agent;
                }
                return { ...agent, ...payload.agent };
            }),
        );
        synchronizeAfterMutation('rename-agent');
    }, [synchronizeAfterMutation]);

    /**
     * Opens the QR code modal for the active context menu agent.
     */
    const handleShowQrCode = useCallback(() => {
        if (contextMenuState) {
            setQrCodeAgent(contextMenuState.agent);
        }
    }, [contextMenuState]);

    /**
     * Resets drag-related UI state.
     */
    const resetDragState = () => {
        setActiveDragItem(null);
        setDropIndicator(null);
    };

    /**
     * Handles drag start events for sortable items.
     *
     * @param event - Drag start event.
     */
    const handleDragStart = (event: DragStartEvent) => {
        if (!canOrganize) {
            return;
        }
        const dragData = event.active.data.current as DragItem | undefined;
        if (dragData) {
            setActiveDragItem(dragData);
        }
    };

    /**
     * Tracks drop intent for folder-to-folder moves.
     *
     * @param event - Drag over event.
     */
    const handleDragOver = (event: DragOverEvent) => {
        if (!canOrganize) {
            return;
        }
        const dragData = event.active.data.current as DragItem | undefined;
        const overData = event.over?.data.current as DragItem | BreadcrumbDropTargetData | undefined;
        if (!dragData || dragData.type !== 'FOLDER' || !event.over || !overData || overData.type !== 'FOLDER') {
            setDropIndicator(null);
            return;
        }
        const activeRect = event.active.rect.current.translated || event.active.rect.current.initial;
        const intent = getDropIntentFromRects(activeRect as TODO_any, event.over.rect as TODO_any);
        setDropIndicator({ id: event.over.id, intent });
    };

    /**
     * Finalizes drag actions and persists reordering or moves.
     *
     * @param event - Drag end event.
     */
    const handleDragEnd = async (event: DragEndEvent) => {
        const currentIndicator = dropIndicator;
        const dragData = event.active.data.current as DragItem | undefined;
        const overData = event.over?.data.current as DragItem | BreadcrumbDropTargetData | undefined;
        resetDragState();

        if (!canOrganize || !dragData || !event.over || !overData) {
            return;
        }

        try {
            if (dragData.type === 'AGENT') {
                if (overData.type === 'AGENT') {
                    await reorderAgents(dragData.identifier, overData.identifier);
                    return;
                }
                if (overData.type === 'FOLDER') {
                    const targetFolderId = Number(overData.identifier);
                    if (!Number.isNaN(targetFolderId)) {
                        await moveAgentToFolder(dragData.identifier, targetFolderId);
                    }
                    return;
                }
                if (overData.type === 'BREADCRUMB') {
                    await moveAgentToFolder(dragData.identifier, overData.folderId ?? null);
                    return;
                }
            }

            if (dragData.type === 'FOLDER') {
                const draggedFolderId = Number(dragData.identifier);
                if (Number.isNaN(draggedFolderId)) {
                    return;
                }

                if (overData.type === 'FOLDER') {
                    const targetFolderId = Number(overData.identifier);
                    if (Number.isNaN(targetFolderId) || draggedFolderId === targetFolderId) {
                        return;
                    }
                    const isInsideDrop = currentIndicator?.id === event.over.id && currentIndicator.intent === 'inside';
                    if (isInsideDrop) {
                        await moveFolderToParent(draggedFolderId, targetFolderId);
                        return;
                    }
                    await reorderFolders(draggedFolderId, targetFolderId);
                    return;
                }

                if (overData.type === 'BREADCRUMB') {
                    await moveFolderToParent(draggedFolderId, overData.folderId ?? null);
                }
            }
        } catch (error) {
            await showAlert({
                title: 'Update failed',
                message: error instanceof Error ? error.message : 'Failed to update organization.',
            }).catch(() => undefined);
            void synchronizeOrganizationState('error-recovery');
        }
    };

    /**
     * Clears drag state when the drag interaction is canceled.
     */
    const handleDragCancel = () => {
        resetDragState();
    };

    /**
     * Builds preview agents for a folder card.
     *
     * @param folderId - Folder to preview.
     * @returns Preview agents for the folder.
     */
    const getFolderPreviewAgents = (folderId: number): AgentBasicInformation[] => {
        const descendantIds = collectDescendantFolderIds(folderId, folderMaps.childrenByParentId);
        const previewSet = new Set(descendantIds);
        const orderedAgents = sortBySortOrder(agents, (agent) => agent.agentName);
        return pickPreviewAgents(orderedAgents, previewSet, 4);
    };

    const dragAgentLabel = formatText('Drag agent');
    const dragFolderLabel = formatText('Drag folder');

    const headingTitle =
        viewMode === 'LIST' && currentFolderId !== null
            ? folderMaps.folderById.get(currentFolderId)?.name || formatText('Local Agents')
            : formatText('Local Agents');
    const contextMenuAgent = contextMenuState?.agent ?? null;
    const contextMenuFolder =
        folderContextMenuState === null ? null : folders.find((folder) => folder.id === folderContextMenuState.folderId) || null;
    const contextMenuIdentifier = contextMenuAgent ? contextMenuAgent.permanentId || contextMenuAgent.agentName : '';
    const contextMenuAgentUrl = contextMenuAgent ? buildAgentUrl(contextMenuIdentifier) : '';
    const contextMenuAgentEmail = contextMenuAgent ? buildAgentEmail(contextMenuIdentifier) : '';
    const contextMenuFolderContext = useMemo(() => {
        if (!contextMenuAgent) {
            return null;
        }
        return buildAgentFolderContext(contextMenuAgent.folderId ?? null, folderMaps.folderById);
    }, [contextMenuAgent, folderMaps.folderById]);
    const qrCodeIdentifier = qrCodeAgent ? qrCodeAgent.permanentId || qrCodeAgent.agentName : '';
    const qrCodeAgentUrl = qrCodeAgent ? buildAgentUrl(qrCodeIdentifier) : '';
    const qrCodeAgentEmail = qrCodeAgent ? buildAgentEmail(qrCodeIdentifier) : '';

    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">
                <div className="flex flex-wrap items-center justify-between w-full gap-4">
                    <div>
                        <span>
                            {headingTitle} ({agentCount})
                        </span>
                        {viewMode === 'LIST' && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <BreadcrumbDropTarget
                                    label={formatText('All Agents')}
                                    folderId={null}
                                    onClick={() => navigateToFolder(null)}
                                    canOrganize={canOrganize}
                                />
                                {breadcrumbFolders.map((folder) => (
                                    <div key={folder.id} className="flex items-center gap-2">
                                        <span>/</span>
                                        <BreadcrumbDropTarget
                                            label={folder.name}
                                            folderId={folder.id}
                                            onClick={() => navigateToFolder(folder.id)}
                                            canOrganize={canOrganize}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'LIST' && canOrganize && (
                            <button
                                type="button"
                                onClick={handleCreateFolder}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors text-sm"
                                title="Create folder"
                            >
                                <FolderPlusIcon className="w-4 h-4" />
                                New Folder
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg ml-4">
                            <button
                                onClick={() => setViewMode('LIST')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                    viewMode === 'LIST'
                                        ? 'bg-white shadow-sm text-blue-600 font-medium'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                title="List View"
                            >
                                <Grid className="w-4 h-4" />
                                <span>List</span>
                            </button>
                            <button
                                onClick={() => setViewMode('GRAPH')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                    viewMode === 'GRAPH'
                                        ? 'bg-white shadow-sm text-blue-600 font-medium'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                                title="Graph View"
                            >
                                <Network className="w-4 h-4" />
                                <span>Graph</span>
                            </button>
                        </div>
                    </div>
                </div>
            </h2>
            {viewMode === 'LIST' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className={HOMEPAGE_AGENT_GRID_CLASS}>
                        {parentFolderInfo && (
                            <ParentFolderCard
                                label={parentFolderInfo.label}
                                folderId={parentFolderInfo.id}
                                onOpen={() => navigateToFolder(parentFolderInfo.id)}
                                canOrganize={canOrganize}
                            />
                        )}
                        <SortableContext items={visibleFolderDragIds} strategy={rectSortingStrategy}>
                            {visibleFolders.map((folder) => (
                                <SortableFolderCard
                                    key={folder.id}
                                    folder={folder}
                                    dragId={getFolderDragId(folder.id)}
                                    previewAgents={getFolderPreviewAgents(folder.id)}
                                    publicUrl={publicUrl}
                                    canOrganize={canOrganize}
                                    activeDragType={activeDragItem?.type ?? null}
                                    dropIndicator={dropIndicator}
                                    onOpen={() => navigateToFolder(folder.id)}
                                    onRename={canOrganize ? () => handleRenameFolder(folder.id) : undefined}
                                    onDelete={canOrganize ? () => handleDeleteFolder(folder.id) : undefined}
                                    onContextMenu={handleFolderContextMenu}
                                    dragHandleLabel={dragFolderLabel}
                                    allowFullCardDrag={allowFullCardDrag}
                                />
                            ))}
                        </SortableContext>
                        <SortableContext items={visibleAgentDragIds} strategy={rectSortingStrategy}>
                            {visibleAgents.map((agent) => {
                                const agentIdentifier = agent.permanentId || agent.agentName;
                                return (
                                    <SortableAgentCard
                                        key={agentIdentifier}
                                        agent={agent}
                                        dragId={getAgentDragId(agentIdentifier)}
                                        agentIdentifier={agentIdentifier}
                                        publicUrl={publicUrl}
                                        isAdmin={isAdmin}
                                        canOrganize={canOrganize}
                                        activeDragType={activeDragItem?.type ?? null}
                                        onDelete={handleDelete}
                                        onRequestVisibilityChange={handleRequestAgentVisibilityChange}
                                        onContextMenu={handleAgentContextMenu}
                                        dragHandleLabel={dragAgentLabel}
                                        allowFullCardDrag={allowFullCardDrag}
                                    />
                                );
                            })}
                        </SortableContext>

                        {isAdmin && <AddAgentButton currentFolderId={currentFolderId} />}
                        {canOrganize && (
                            <Link
                                href="/recycle-bin"
                                className="flex items-center gap-2 px-4 py-2 mt-4 text-gray-600 hover:text-red-600 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Open Recycle Bin
                            </Link>
                        )}
                    </div>
                    <DragOverlay>
                        {activeDragItem?.type === 'AGENT' && activeAgent ? (
                            <div className="pointer-events-none scale-105 drop-shadow-2xl">
                                <AgentCard
                                    agent={activeAgent}
                                    publicUrl={publicUrl}
                                    href={`/agents/${encodeURIComponent(
                                        activeAgent.permanentId || activeAgent.agentName,
                                    )}`}
                                    isAdmin={false}
                                    visibility={activeAgent.visibility}
                                />
                            </div>
                        ) : activeDragItem?.type === 'FOLDER' && activeFolder ? (
                            <div className="pointer-events-none scale-105 drop-shadow-2xl">
                                <FolderCard
                                    folderName={activeFolder.name}
                                    folderIcon={activeFolder.icon}
                                    folderColor={activeFolder.color}
                                    previewAgents={getFolderPreviewAgents(activeFolder.id)}
                                    publicUrl={publicUrl}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <div className="w-full">
                    <AgentsGraph
                        agents={agents.map((a) => ({ ...a, serverUrl: publicUrl.replace(/\/$/, '') }))}
                        federatedAgents={federatedAgents}
                        federatedServersStatus={federatedServersStatus}
                        publicUrl={publicUrl}
                        folders={folders}
                    />
                </div>
            )}
            {folderEditDialogState && (
                <FolderEditDialog
                    isOpen={Boolean(folderEditDialogState)}
                    mode={folderEditDialogState.mode}
                    initialValues={folderEditDialogState.initialValues}
                    isSubmitting={isFolderEditSubmitting}
                    onClose={handleCloseFolderEditDialog}
                    onSubmit={handleSubmitFolderEdit}
                />
            )}
            {contextMenuAgent && (
                <AgentContextMenuPopover
                    agent={contextMenuAgent as AgentProfile}
                    isOpen={Boolean(contextMenuState)}
                    anchorPoint={contextMenuState?.anchorPoint ?? null}
                    onClose={handleCloseContextMenu}
                    agentName={contextMenuIdentifier}
                    derivedAgentName={contextMenuAgent?.agentName ?? ''}
                    permanentId={contextMenuAgent?.permanentId}
                    agentUrl={contextMenuAgentUrl}
                    agentEmail={contextMenuAgentEmail}
                    folderContext={contextMenuFolderContext}
                    isAdmin={isAdmin}
                    onShowQrCode={handleShowQrCode}
                    onAgentRenamed={handleContextMenuAgentRenamed}
                    fromDirectoryListing
                />
            )}
            {contextMenuFolder && (
                <FolderContextMenuPopover
                    folder={contextMenuFolder}
                    isOpen={Boolean(folderContextMenuState)}
                    anchorPoint={folderContextMenuState?.anchorPoint ?? null}
                    onClose={handleCloseFolderContextMenu}
                    onOpenFolder={() => navigateToFolder(contextMenuFolder.id)}
                    onRenameFolder={canOrganize ? () => handleRenameFolder(contextMenuFolder.id) : undefined}
                    onDeleteFolder={canOrganize ? () => handleDeleteFolder(contextMenuFolder.id) : undefined}
                    onRequestVisibilityUpdate={
                        isAdmin ? () => handleRequestFolderVisibilityUpdate(contextMenuFolder.id) : undefined
                    }
                />
            )}
            {qrCodeAgent && (
                <AgentQrCodeModal
                    agent={qrCodeAgent}
                    agentUrl={qrCodeAgentUrl}
                    agentEmail={qrCodeAgentEmail}
                    onClose={() => setQrCodeAgent(null)}
                />
            )}
        </section>
    );
}
