'use client';

import {
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { TODO_any, string_url } from '@promptbook-local/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type MouseEvent,
    type SetStateAction,
} from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { buildAgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '../../utils/agentOrganization/folderAppearance';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import { DEFAULT_AGENT_VISIBILITY, type AgentVisibility } from '../../utils/agentVisibility';
import type { AgentContextMenuRenamePayload } from '../AgentContextMenu/AgentContextMenu';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert, showConfirm, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
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
import type { DragItem } from './DragItem';
import type { DropIndicator } from './DropIndicator';
import type { FolderEditValues } from './FolderEditDialog';
import { getDropIntentFromRects } from './getDropIntentFromRects';
import {
    getHomeViewQueryValue,
    resolveHomeViewMode,
    type HomeViewMode,
} from './homeViewMode';
import type { BreadcrumbDropTargetData } from './useBreadcrumbDropTarget';
import { useFederatedAgents, type AgentWithVisibility, type FederatedServerStatus } from './useFederatedAgents';
import { useIsTouchInput } from './useIsTouchInput';

/**
 * State for the agent context menu.
 *
 * @private function of AgentsList
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
 *
 * @private function of AgentsList
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
 *
 * @private function of AgentsList
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

/**
 * Route-facing props consumed by the internal AgentsList state hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListStateProps = {
    /**
     * List of agents to display.
     */
    readonly agents: AgentOrganizationAgent[];
    /**
     * List of folders to display.
     */
    readonly folders: AgentOrganizationFolder[];
    /**
     * Indicates if the current user has administrative privileges.
     */
    readonly isAdmin: boolean;
    /**
     * Indicates if the current user can organize agents and folders.
     */
    readonly canOrganize: boolean;
    /**
     * Controls whether federated agents are loaded and shown in graph view.
     */
    readonly showFederatedAgents: boolean;
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Optional external agents to display in list view.
     */
    readonly externalAgents?: AgentWithVisibility[];
    /**
     * Whether the current view is inside a subfolder.
     */
    readonly isSubfolderView: boolean;
};

/**
 * Reason labels used for organization synchronization telemetry.
 *
 * @private function of AgentsList
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
 *
 * @private function of AgentsList
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
 * Summary of the parent folder breadcrumb shortcut.
 *
 * @private function of AgentsList
 */
type ParentFolderInfo = {
    /**
     * Folder id opened by the shortcut.
     */
    readonly id: number | null;
    /**
     * Label shown on the shortcut card.
     */
    readonly label: string;
};

/**
 * Normalized organization snapshot returned from synchronization.
 *
 * @private function of AgentsList
 */
type OrganizationSnapshot = {
    /**
     * Latest agents returned by the server.
     */
    readonly agents: AgentOrganizationAgent[];
    /**
     * Latest folders returned by the server.
     */
    readonly folders: AgentOrganizationFolder[];
    /**
     * Server timestamp indicating snapshot freshness.
     */
    readonly syncedAt: string | null;
};

/**
 * Descendant lookup for one folder subtree.
 *
 * @private function of AgentsList
 */
type FolderDescendantContext = {
    /**
     * All descendant folder ids including the root folder.
     */
    readonly ids: number[];
    /**
     * Fast lookup set for descendant folder membership checks.
     */
    readonly idSet: Set<number>;
};

/**
 * Drop target payload accepted by drag-and-drop handlers.
 *
 * @private function of AgentsList
 */
type DropTargetData = DragItem | BreadcrumbDropTargetData;

/**
 * Outcome of validating and planning a folder move.
 *
 * @private function of AgentsList
 */
type FolderMovePlan =
    | { readonly type: 'NO_OP' }
    | { readonly type: 'INVALID_PARENT' }
    | {
          readonly type: 'UPDATES';
          readonly updates: AgentOrganizationFolder[];
      };

/**
 * Planned action for a dragged agent.
 *
 * @private function of AgentsList
 */
type AgentDropAction =
    | {
          readonly type: 'REORDER_AGENT';
          readonly draggedIdentifier: string;
          readonly targetIdentifier: string;
      }
    | {
          readonly type: 'MOVE_AGENT';
          readonly draggedIdentifier: string;
          readonly targetFolderId: number | null;
      };

/**
 * Planned action for a dragged folder.
 *
 * @private function of AgentsList
 */
type FolderDropAction =
    | {
          readonly type: 'REORDER_FOLDER';
          readonly draggedFolderId: number;
          readonly targetFolderId: number;
      }
    | {
          readonly type: 'MOVE_FOLDER';
          readonly draggedFolderId: number;
          readonly targetParentId: number | null;
      };

/**
 * Translation helper shared across private `AgentsList` state builders.
 *
 * @private function of AgentsList
 */
type AgentNamingFormatter = ReturnType<typeof useAgentNaming>['formatText'];

/**
 * Minimal App Router shape shared across private `AgentsList` hooks.
 *
 * @private function of AgentsList
 */
type AgentsListRouter = ReturnType<typeof useRouter>;

/**
 * Stable folder breadcrumb shape shared across `AgentsList` helpers.
 *
 * @private function of AgentsList
 */
type BreadcrumbFolder = Pick<AgentOrganizationFolder, 'id' | 'name'>;

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
 * Folder-navigation callback shared across private `AgentsList` hooks.
 *
 * @private function of AgentsList
 */
type FolderNavigator = (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => void;

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
type AgentsListSyncState = {
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
 * Props accepted by the stale-folder-path recovery hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderPathRecoveryProps = {
    readonly currentFolderId: number | null;
    readonly folderPathSegments: ReadonlyArray<string>;
    readonly lastSyncedRouteKey: string | null;
    readonly folderQuery: string | null;
    readonly pathname: string;
    readonly routeSyncKey: string;
    readonly router: AgentsListRouter;
    readonly searchParamsSnapshot: string;
};

/**
 * Props accepted by the private organization-mutation hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListOrganizationActionsProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly childrenByParentId: ReadonlyMap<number | null, number[]>;
    readonly folders: AgentOrganizationFolder[];
    readonly setAgents: AgentOrganizationStateSetter;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
    readonly visibleAgents: AgentOrganizationAgent[];
    readonly visibleFolders: AgentOrganizationFolder[];
};

/**
 * Organization mutation handlers shared across drag-and-drop and folder actions.
 *
 * @private function of AgentsList
 */
type AgentsListOrganizationActions = {
    readonly moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>;
    readonly moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>;
    readonly reorderAgents: (draggedId: string, targetId: string) => Promise<void>;
    readonly reorderFolders: (draggedId: number, targetId: number) => Promise<void>;
};

/**
 * Props accepted by the private folder-management hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListFolderStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly breadcrumbFolders: ReadonlyArray<BreadcrumbFolder>;
    readonly childrenByParentId: ReadonlyMap<number | null, number[]>;
    readonly currentFolderId: number | null;
    readonly folders: AgentOrganizationFolder[];
    readonly formatText: AgentNamingFormatter;
    readonly navigateToFolder: FolderNavigator;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly setFolders: FolderOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Folder-management state returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type AgentsListFolderState = {
    readonly folderEditDialogState: FolderEditDialogState | null;
    readonly handleCloseFolderEditDialog: () => void;
    readonly handleCreateFolder: () => void;
    readonly handleDeleteFolder: (folderId: number) => Promise<void>;
    readonly handleRenameFolder: (folderId: number) => void;
    readonly handleRequestFolderVisibilityUpdate: (folderId: number) => Promise<void>;
    readonly handleSubmitFolderEdit: (values: FolderEditValues) => Promise<void>;
    readonly isFolderEditSubmitting: boolean;
};

/**
 * Props accepted by the private agent-action hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListAgentStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly formatText: AgentNamingFormatter;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Agent-action handlers returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type AgentsListAgentState = {
    readonly handleContextMenuAgentRenamed: (payload: AgentContextMenuRenamePayload) => void;
    readonly handleDelete: (agentIdentifier: string) => Promise<void>;
    readonly handleRequestAgentVisibilityChange: (agentIdentifier: string) => Promise<void>;
};

/**
 * Overlay state for context menus and the QR-code modal.
 *
 * @private function of AgentsList
 */
type AgentsListOverlayState = {
    readonly contextMenuState: AgentContextMenuState | null;
    readonly folderContextMenuState: FolderContextMenuState | null;
    readonly handleAgentContextMenu: (event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => void;
    readonly handleCloseContextMenu: () => void;
    readonly handleCloseFolderContextMenu: () => void;
    readonly handleCloseQrCode: () => void;
    readonly handleFolderContextMenu: (event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => void;
    readonly handleShowQrCode: () => void;
    readonly qrCodeAgent: AgentOrganizationAgent | null;
};

/**
 * Props accepted by the private drag-and-drop hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListDragStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly canOrganize: boolean;
    readonly folders: AgentOrganizationFolder[];
    readonly moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>;
    readonly moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>;
    readonly reorderAgents: (draggedId: string, targetId: string) => Promise<void>;
    readonly reorderFolders: (draggedId: number, targetId: number) => Promise<void>;
    readonly synchronizeOrganizationState: (
        reason: AgentOrganizationSyncReason,
        routeKeyAtSync?: string,
    ) => Promise<void>;
};

/**
 * Drag-and-drop state returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type AgentsListDragState = {
    readonly activeAgent: AgentOrganizationAgent | null;
    readonly activeDragItem: DragItem | null;
    readonly activeFolder: AgentOrganizationFolder | null;
    readonly dropIndicator: DropIndicator | null;
    readonly handleDragCancel: () => void;
    readonly handleDragEnd: (event: DragEndEvent) => Promise<void>;
    readonly handleDragOver: (event: DragOverEvent) => void;
    readonly handleDragStart: (event: DragStartEvent) => void;
};

/**
 * Prefix for agent drag IDs.
 *
 * @private function of AgentsList
 */
const AGENT_DRAG_ID_PREFIX = 'agent:';

/**
 * Prefix for folder drag IDs.
 *
 * @private function of AgentsList
 */
const FOLDER_DRAG_ID_PREFIX = 'folder:';

/**
 * Mouse drag activation distance in pixels.
 *
 * @private function of AgentsList
 */
const DRAG_START_DISTANCE_PX = 8;

/**
 * Touch drag activation delay in milliseconds.
 *
 * @private function of AgentsList
 */
const TOUCH_DRAG_DELAY_MS = 250;

/**
 * Touch drag movement tolerance in pixels.
 *
 * @private function of AgentsList
 */
const TOUCH_DRAG_TOLERANCE_PX = 6;

/**
 * API endpoint used to synchronize the organization snapshot.
 *
 * @private function of AgentsList
 */
const AGENT_ORGANIZATION_SYNC_API_PATH = '/api/agent-organization';

/**
 * Indicates whether development-only diagnostics should be emitted.
 *
 * @private function of AgentsList
 */
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/**
 * Writes synchronization diagnostics in development builds only.
 *
 * @param message - Diagnostic message.
 * @param details - Optional structured payload for debugging.
 *
 * @private function of AgentsList
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
 * Builds a stable identifier for one local agent.
 *
 * @param agent - Agent to identify.
 * @returns Stable identifier used throughout drag, sorting, and mutations.
 *
 * @private function of AgentsList
 */
function getAgentIdentifier(agent: Pick<AgentOrganizationAgent, 'permanentId' | 'agentName'>): string {
    return agent.permanentId || agent.agentName;
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
 * Builds a unique drag identifier with a stable prefix.
 *
 * @param prefix - Prefix describing the drag item type.
 * @param identifier - Unique identifier for the item.
 * @returns Stable drag identifier string.
 *
 * @private function of AgentsList
 */
function buildDragId(prefix: string, identifier: string): string {
    return `${prefix}${identifier}`;
}

/**
 * Builds a drag identifier for an agent.
 *
 * @param identifier - Agent identifier.
 * @returns Drag identifier string.
 *
 * @private function of AgentsList
 */
function getAgentDragId(identifier: string): string {
    return buildDragId(AGENT_DRAG_ID_PREFIX, identifier);
}

/**
 * Builds a drag identifier for a folder.
 *
 * @param folderId - Folder id to encode.
 * @returns Drag identifier string.
 *
 * @private function of AgentsList
 */
function getFolderDragId(folderId: number): string {
    return buildDragId(FOLDER_DRAG_ID_PREFIX, String(folderId));
}

/**
 * Creates the initial values shown in the folder dialog.
 *
 * @param folder - Optional folder whose values should seed the dialog.
 * @returns Folder edit form values.
 *
 * @private function of AgentsList
 */
function createFolderEditInitialValues(folder?: AgentOrganizationFolder | null): FolderEditValues {
    return {
        name: folder?.name ?? '',
        icon: folder?.icon ?? DEFAULT_FOLDER_ICON,
        color: folder?.color ?? DEFAULT_FOLDER_COLOR,
    };
}

/**
 * Creates create/edit dialog state for folder operations.
 *
 * @param mode - Dialog mode.
 * @param folderId - Edited folder id or null for create mode.
 * @param folder - Optional folder used to seed edit defaults.
 * @returns Dialog state object.
 *
 * @private function of AgentsList
 */
function createFolderEditDialogState(
    mode: FolderEditDialogState['mode'],
    folderId: number | null,
    folder?: AgentOrganizationFolder | null,
): FolderEditDialogState {
    return {
        mode,
        folderId,
        initialValues: createFolderEditInitialValues(folder),
    };
}

/**
 * Moves an item within an array.
 *
 * @param items - Items to reorder.
 * @param fromIndex - Source index.
 * @param toIndex - Target index.
 * @returns Reordered array copy.
 *
 * @private function of AgentsList
 */
function moveItem<T>(items: ReadonlyArray<T>, fromIndex: number, toIndex: number): T[] {
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    const clampedIndex = Math.max(0, Math.min(updated.length, toIndex));
    updated.splice(clampedIndex, 0, moved);
    return updated;
}

/**
 * Validates a folder name before create/edit actions.
 *
 * @param name - Folder name to validate.
 * @returns Error message for invalid names, otherwise null.
 *
 * @private function of AgentsList
 */
function validateFolderName(name: string): string | null {
    if (!name) {
        return 'Folder name cannot be empty.';
    }
    if (name.includes('/')) {
        return 'Folder name cannot include "/".';
    }
    return null;
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
 * Ensures a public URL always ends with a trailing slash.
 *
 * @param publicUrl - Base public URL of the Agents Server.
 * @returns Normalized public URL.
 *
 * @private function of AgentsList
 */
function normalizePublicUrl(publicUrl: string_url): string {
    return publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
}

/**
 * Resolves the hostname used for agent email aliases.
 *
 * @param publicUrl - Normalized public URL.
 * @returns Hostname or an empty string when the URL is invalid.
 *
 * @private function of AgentsList
 */
function resolvePublicUrlHost(publicUrl: string): string {
    try {
        return new URL(publicUrl).hostname;
    } catch {
        return '';
    }
}

/**
 * Resolves the parent-folder shortcut shown above the list.
 *
 * @param currentFolderId - Folder currently opened in the list view.
 * @param folderById - Folder lookup indexed by id.
 * @param allAgentsLabel - Localized label for the root scope.
 * @returns Parent folder shortcut metadata or null at the root.
 *
 * @private function of AgentsList
 */
function resolveParentFolderInfo(
    currentFolderId: number | null,
    folderById: ReadonlyMap<number, AgentOrganizationFolder>,
    allAgentsLabel: string,
): ParentFolderInfo | null {
    if (currentFolderId === null) {
        return null;
    }

    const currentFolder = folderById.get(currentFolderId);
    const parentFolderId = currentFolder?.parentId ?? null;
    const parentFolderName =
        parentFolderId === null ? allAgentsLabel : folderById.get(parentFolderId)?.name || allAgentsLabel;

    return { id: parentFolderId, label: parentFolderName };
}

/**
 * Returns folders visible in the currently opened parent folder.
 *
 * @param folders - All folders in the organization.
 * @param currentFolderId - Current folder scope.
 * @returns Sorted folders visible in the current scope.
 *
 * @private function of AgentsList
 */
function getVisibleFolders(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    currentFolderId: number | null,
): AgentOrganizationFolder[] {
    return sortBySortOrder(
        folders.filter((folder) => (folder.parentId ?? null) === (currentFolderId ?? null)),
        (folder) => folder.name,
    );
}

/**
 * Returns agents visible in the currently opened folder scope.
 *
 * @param agents - All agents in the organization.
 * @param currentFolderId - Current folder scope.
 * @returns Sorted agents visible in the current scope.
 *
 * @private function of AgentsList
 */
function getVisibleAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    currentFolderId: number | null,
): AgentOrganizationAgent[] {
    return sortBySortOrder(
        agents.filter((agent) => (agent.folderId ?? null) === (currentFolderId ?? null)),
        (agent) => agent.agentName,
    );
}

/**
 * Resolves the folder set used by office-style views.
 *
 * @param currentFolderId - Current folder scope.
 * @param childrenByParentId - Folder child lookup.
 * @returns Folder id set for the office scope or null at the root.
 *
 * @private function of AgentsList
 */
function createOfficeVisibleFolderIdSet(
    currentFolderId: number | null,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
): Set<number> | null {
    if (currentFolderId === null) {
        return null;
    }

    return new Set(collectDescendantFolderIds(currentFolderId, new Map(childrenByParentId)));
}

/**
 * Filters agents for office-style subtree rendering.
 *
 * @param agents - All local agents.
 * @param officeVisibleFolderIds - Folder scope for office views.
 * @returns Agents visible in the office scope.
 *
 * @private function of AgentsList
 */
function getOfficeAgents(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    officeVisibleFolderIds: ReadonlySet<number> | null,
): AgentOrganizationAgent[] {
    if (officeVisibleFolderIds === null) {
        return Array.from(agents);
    }

    return agents.filter((agent) => agent.folderId !== null && officeVisibleFolderIds.has(agent.folderId));
}

/**
 * Filters folders for office-style subtree rendering.
 *
 * @param folders - All folders in the organization.
 * @param officeVisibleFolderIds - Folder scope for office views.
 * @returns Folders visible in the office scope.
 *
 * @private function of AgentsList
 */
function getOfficeFolders(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    officeVisibleFolderIds: ReadonlySet<number> | null,
): AgentOrganizationFolder[] {
    if (officeVisibleFolderIds === null) {
        return Array.from(folders);
    }

    return folders.filter((folder) => officeVisibleFolderIds.has(folder.id));
}

/**
 * Resolves the agent counter shown in the list header.
 *
 * @param viewMode - Current homepage view mode.
 * @param visibleAgentCount - Number of agents visible in list view.
 * @param officeAgentCount - Number of agents visible in office views.
 * @param totalAgentCount - Total number of local agents.
 * @returns Count matching the current view.
 *
 * @private function of AgentsList
 */
function resolveAgentCount(
    viewMode: HomeViewMode,
    visibleAgentCount: number,
    officeAgentCount: number,
    totalAgentCount: number,
): number {
    if (viewMode === 'LIST') {
        return visibleAgentCount;
    }

    if (viewMode === 'OFFICE' || viewMode === 'PIXEL_OFFICE') {
        return officeAgentCount;
    }

    return totalAgentCount;
}

/**
 * Finds one agent by its stable list identifier.
 *
 * @param agents - Agents to search.
 * @param identifier - Agent identifier used throughout the UI.
 * @returns Matching agent or undefined.
 *
 * @private function of AgentsList
 */
function findAgentByIdentifier(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    identifier: string,
): AgentOrganizationAgent | undefined {
    return agents.find((agent) => getAgentIdentifier(agent) === identifier);
}

/**
 * Finds one folder by its numeric identifier.
 *
 * @param folders - Folders to search.
 * @param folderId - Folder identifier.
 * @returns Matching folder or undefined.
 *
 * @private function of AgentsList
 */
function findFolderById(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    folderId: number,
): AgentOrganizationFolder | undefined {
    return folders.find((folder) => folder.id === folderId);
}

/**
 * Finds the currently dragged agent from drag state.
 *
 * @param activeDragItem - Active drag item metadata.
 * @param agents - Current local agents.
 * @returns Dragged agent or null when not dragging an agent.
 *
 * @private function of AgentsList
 */
function resolveDraggedAgent(
    activeDragItem: DragItem | null,
    agents: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationAgent | null {
    if (activeDragItem?.type !== 'AGENT') {
        return null;
    }

    return findAgentByIdentifier(agents, activeDragItem.identifier) || null;
}

/**
 * Finds the currently dragged folder from drag state.
 *
 * @param activeDragItem - Active drag item metadata.
 * @param folders - Current local folders.
 * @returns Dragged folder or null when not dragging a folder.
 *
 * @private function of AgentsList
 */
function resolveDraggedFolder(
    activeDragItem: DragItem | null,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationFolder | null {
    if (activeDragItem?.type !== 'FOLDER') {
        return null;
    }

    return folders.find((folder) => String(folder.id) === activeDragItem.identifier) || null;
}

/**
 * Resolves the folder currently associated with the folder context menu.
 *
 * @param folders - Current local folders.
 * @param folderContextMenuState - Context-menu state for folders.
 * @returns Matching folder or null when no folder menu is open.
 *
 * @private function of AgentsList
 */
function resolveContextMenuFolder(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    folderContextMenuState: FolderContextMenuState | null,
): AgentOrganizationFolder | null {
    if (folderContextMenuState === null) {
        return null;
    }

    return findFolderById(folders, folderContextMenuState.folderId) || null;
}

/**
 * Resolves the main heading shown above the list content.
 *
 * @param viewMode - Current homepage view mode.
 * @param currentFolderId - Current folder scope.
 * @param folderById - Folder lookup indexed by id.
 * @param localAgentsLabel - Localized fallback title.
 * @returns Heading title for the current view.
 *
 * @private function of AgentsList
 */
function resolveHeadingTitle(
    viewMode: HomeViewMode,
    currentFolderId: number | null,
    folderById: ReadonlyMap<number, AgentOrganizationFolder>,
    localAgentsLabel: string,
): string {
    if (viewMode === 'GRAPH' || currentFolderId === null) {
        return localAgentsLabel;
    }

    return folderById.get(currentFolderId)?.name || localAgentsLabel;
}

/**
 * Builds descendant ids and a membership set for one folder subtree.
 *
 * @param folderId - Root folder id.
 * @param childrenByParentId - Child folder lookup.
 * @returns Descendant lookup metadata.
 *
 * @private function of AgentsList
 */
function createFolderDescendantContext(
    folderId: number,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
): FolderDescendantContext {
    const ids = collectDescendantFolderIds(folderId, new Map(childrenByParentId));

    return {
        ids,
        idSet: new Set(ids),
    };
}

/**
 * Resolves the next append position for a sorted sibling list.
 *
 * @param items - Sorted sibling list.
 * @returns Sort order for an appended item.
 *
 * @private function of AgentsList
 */
function resolveNextSortOrder<T extends { sortOrder: number }>(items: ReadonlyArray<T>): number {
    return items.length > 0 ? items[items.length - 1].sortOrder + 1 : 0;
}

/**
 * Creates the POST payload used to persist folder organization changes.
 *
 * @param folders - Updated folders to persist.
 * @returns Organization update payload containing folder updates.
 *
 * @private function of AgentsList
 */
function buildFolderOrganizationUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationUpdatePayload {
    return {
        folders: folders.map((folder) => ({
            id: folder.id,
            parentId: folder.parentId ?? null,
            sortOrder: folder.sortOrder,
        })),
    };
}

/**
 * Creates the POST payload used to persist agent organization changes.
 *
 * @param agents - Updated agents to persist.
 * @returns Organization update payload containing agent updates.
 *
 * @private function of AgentsList
 */
function buildAgentOrganizationUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationUpdatePayload {
    return {
        agents: agents.map((agent) => ({
            identifier: getAgentIdentifier(agent),
            folderId: agent.folderId ?? null,
            sortOrder: agent.sortOrder,
        })),
    };
}

/**
 * Applies folder updates over the current local folder list.
 *
 * @param folders - Existing local folders.
 * @param updates - Updated folders to merge.
 * @returns Folder list with updates applied.
 *
 * @private function of AgentsList
 */
function applyFolderUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    updates: ReadonlyArray<AgentOrganizationFolder>,
): AgentOrganizationFolder[] {
    const updatedMap = new Map(updates.map((folder) => [folder.id, folder]));

    return folders.map((folder) => updatedMap.get(folder.id) || folder);
}

/**
 * Applies agent updates over the current local agent list.
 *
 * @param agents - Existing local agents.
 * @param updates - Updated agents to merge.
 * @returns Agent list with updates applied.
 *
 * @private function of AgentsList
 */
function applyAgentUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    updates: ReadonlyArray<AgentOrganizationAgent>,
): AgentOrganizationAgent[] {
    const updatedMap = new Map(updates.map((agent) => [getAgentIdentifier(agent), agent]));

    return agents.map((agent) => updatedMap.get(getAgentIdentifier(agent)) || agent);
}

/**
 * Plans folder reordering inside the current folder scope.
 *
 * @param folders - All local folders.
 * @param visibleFolders - Folders visible in the current scope.
 * @param draggedId - Folder id being moved.
 * @param targetId - Folder id being targeted.
 * @returns Updated folders or null when no reorder is needed.
 *
 * @private function of AgentsList
 */
function createReorderedFolderUpdates(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    visibleFolders: ReadonlyArray<AgentOrganizationFolder>,
    draggedId: number,
    targetId: number,
): AgentOrganizationFolder[] | null {
    const orderedFolderIds = visibleFolders.map((folder) => folder.id);
    const fromIndex = orderedFolderIds.indexOf(draggedId);
    const targetIndex = orderedFolderIds.indexOf(targetId);

    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
        return null;
    }

    return moveItem(orderedFolderIds, fromIndex, targetIndex)
        .map((id, index) => {
            const folder = findFolderById(folders, id);

            return folder ? { ...folder, sortOrder: index } : null;
        })
        .filter(Boolean) as AgentOrganizationFolder[];
}

/**
 * Plans agent reordering inside the current folder scope.
 *
 * @param agents - All local agents.
 * @param visibleAgents - Agents visible in the current scope.
 * @param draggedId - Agent identifier being moved.
 * @param targetId - Agent identifier being targeted.
 * @returns Updated agents or null when no reorder is needed.
 *
 * @private function of AgentsList
 */
function createReorderedAgentUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    visibleAgents: ReadonlyArray<AgentOrganizationAgent>,
    draggedId: string,
    targetId: string,
): AgentOrganizationAgent[] | null {
    const orderedAgentIds = visibleAgents.map((agent) => getAgentIdentifier(agent));
    const fromIndex = orderedAgentIds.indexOf(draggedId);
    const targetIndex = orderedAgentIds.indexOf(targetId);

    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
        return null;
    }

    return moveItem(orderedAgentIds, fromIndex, targetIndex)
        .map((identifier, index) => {
            const agent = findAgentByIdentifier(agents, identifier);

            return agent ? { ...agent, sortOrder: index } : null;
        })
        .filter(Boolean) as AgentOrganizationAgent[];
}

/**
 * Plans a folder move into another folder or the root.
 *
 * @param folders - All local folders.
 * @param childrenByParentId - Child folder lookup.
 * @param folderId - Folder being moved.
 * @param targetParentId - Target parent folder id.
 * @returns Validated folder move plan.
 *
 * @private function of AgentsList
 */
function createFolderMovePlan(
    folders: ReadonlyArray<AgentOrganizationFolder>,
    childrenByParentId: ReadonlyMap<number | null, number[]>,
    folderId: number,
    targetParentId: number | null,
): FolderMovePlan {
    if (folderId === targetParentId) {
        return { type: 'NO_OP' };
    }

    const folder = findFolderById(folders, folderId);
    if (!folder) {
        return { type: 'NO_OP' };
    }

    const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
    if (targetParentId !== null && descendantContext.idSet.has(targetParentId)) {
        return { type: 'INVALID_PARENT' };
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
    const updatedFolder = {
        ...folder,
        parentId: targetParentId,
        sortOrder: resolveNextSortOrder(targetSiblings),
    };

    return {
        type: 'UPDATES',
        updates: [...sourceSiblings.map((item, index) => ({ ...item, sortOrder: index })), updatedFolder],
    };
}

/**
 * Plans moving one agent into another folder or the root.
 *
 * @param agents - All local agents.
 * @param identifier - Agent identifier being moved.
 * @param targetFolderId - Target folder id.
 * @returns Updated agents or null when no move is needed.
 *
 * @private function of AgentsList
 */
function createAgentMoveUpdates(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    identifier: string,
    targetFolderId: number | null,
): AgentOrganizationAgent[] | null {
    const agent = findAgentByIdentifier(agents, identifier);
    if (!agent) {
        return null;
    }

    const sourceFolderId = agent.folderId ?? null;
    if (sourceFolderId === targetFolderId) {
        return null;
    }

    const sourceAgents = sortBySortOrder(
        agents.filter((item) => (item.folderId ?? null) === sourceFolderId && getAgentIdentifier(item) !== identifier),
        (item) => item.agentName,
    );
    const targetAgents = sortBySortOrder(
        agents.filter((item) => (item.folderId ?? null) === targetFolderId),
        (item) => item.agentName,
    );
    const updatedAgent = {
        ...agent,
        folderId: targetFolderId,
        sortOrder: resolveNextSortOrder(targetAgents),
    };

    return [...sourceAgents.map((item, index) => ({ ...item, sortOrder: index })), updatedAgent];
}

/**
 * Trims and validates folder edit values before submission.
 *
 * @param values - Folder dialog values to validate.
 * @returns Normalized values and a validation error when present.
 *
 * @private function of AgentsList
 */
function normalizeFolderEditValues(values: FolderEditValues): {
    readonly normalizedValues: FolderEditValues;
    readonly errorMessage: string | null;
} {
    const normalizedValues = { ...values, name: values.name.trim() };

    return {
        normalizedValues,
        errorMessage: validateFolderName(normalizedValues.name),
    };
}

/**
 * Resolves the failure dialog title for folder create/edit submission.
 *
 * @param mode - Current folder dialog mode.
 * @returns Dialog title for failed submission.
 *
 * @private function of AgentsList
 */
function resolveFolderEditFailureTitle(mode: FolderEditDialogState['mode']): string {
    return mode === 'CREATE' ? 'Create failed' : 'Update failed';
}

/**
 * Resolves the drop indicator for folder-on-folder hover interactions.
 *
 * @param event - Current drag-over event.
 * @returns Drop indicator or null when not hovering a valid folder target.
 *
 * @private function of AgentsList
 */
function resolveFolderDropIndicator(event: DragOverEvent): DropIndicator | null {
    const dragData = event.active.data.current as DragItem | undefined;
    const overData = event.over?.data.current as DropTargetData | undefined;

    if (!dragData || dragData.type !== 'FOLDER' || !event.over || !overData || overData.type !== 'FOLDER') {
        return null;
    }

    const activeRect = event.active.rect.current.translated || event.active.rect.current.initial;
    const intent = getDropIntentFromRects(activeRect as TODO_any, event.over.rect as TODO_any);

    return { id: event.over.id, intent };
}

/**
 * Resolves the intended operation for an agent drag-and-drop completion.
 *
 * @param dragData - Dragged item metadata.
 * @param overData - Drop target metadata.
 * @returns Planned agent drag action or null when the drop should be ignored.
 *
 * @private function of AgentsList
 */
function resolveAgentDropAction(dragData: DragItem, overData: DropTargetData): AgentDropAction | null {
    if (overData.type === 'AGENT') {
        return {
            type: 'REORDER_AGENT',
            draggedIdentifier: dragData.identifier,
            targetIdentifier: overData.identifier,
        };
    }

    if (overData.type === 'FOLDER') {
        const targetFolderId = Number(overData.identifier);
        if (Number.isNaN(targetFolderId)) {
            return null;
        }

        return {
            type: 'MOVE_AGENT',
            draggedIdentifier: dragData.identifier,
            targetFolderId,
        };
    }

    if (overData.type === 'BREADCRUMB') {
        return {
            type: 'MOVE_AGENT',
            draggedIdentifier: dragData.identifier,
            targetFolderId: overData.folderId ?? null,
        };
    }

    return null;
}

/**
 * Resolves the intended operation for a folder drag-and-drop completion.
 *
 * @param dragData - Dragged folder metadata.
 * @param overData - Drop target metadata.
 * @param overId - Raw dnd-kit drop target id.
 * @param currentIndicator - Drop indicator captured before reset.
 * @returns Planned folder drag action or null when the drop should be ignored.
 *
 * @private function of AgentsList
 */
function resolveFolderDropAction(
    dragData: DragItem,
    overData: DropTargetData,
    overId: string | number,
    currentIndicator: DropIndicator | null,
): FolderDropAction | null {
    const draggedFolderId = Number(dragData.identifier);
    if (Number.isNaN(draggedFolderId)) {
        return null;
    }

    if (overData.type === 'FOLDER') {
        const targetFolderId = Number(overData.identifier);
        if (Number.isNaN(targetFolderId) || draggedFolderId === targetFolderId) {
            return null;
        }

        const isInsideDrop = currentIndicator?.id === overId && currentIndicator.intent === 'inside';
        if (isInsideDrop) {
            return {
                type: 'MOVE_FOLDER',
                draggedFolderId,
                targetParentId: targetFolderId,
            };
        }

        return {
            type: 'REORDER_FOLDER',
            draggedFolderId,
            targetFolderId,
        };
    }

    if (overData.type === 'BREADCRUMB') {
        return {
            type: 'MOVE_FOLDER',
            draggedFolderId,
            targetParentId: overData.folderId ?? null,
        };
    }

    return null;
}

/**
 * Executes a planned agent drag-and-drop action.
 *
 * @param action - Planned drag outcome.
 * @param reorderAgents - Agent reordering implementation.
 * @param moveAgentToFolder - Agent move implementation.
 * @returns Promise resolving when the action finishes.
 *
 * @private function of AgentsList
 */
async function executeAgentDropAction(
    action: AgentDropAction | null,
    reorderAgents: (draggedId: string, targetId: string) => Promise<void>,
    moveAgentToFolder: (identifier: string, targetFolderId: number | null) => Promise<void>,
): Promise<void> {
    if (!action) {
        return;
    }

    if (action.type === 'REORDER_AGENT') {
        await reorderAgents(action.draggedIdentifier, action.targetIdentifier);
        return;
    }

    await moveAgentToFolder(action.draggedIdentifier, action.targetFolderId);
}

/**
 * Executes a planned folder drag-and-drop action.
 *
 * @param action - Planned drag outcome.
 * @param reorderFolders - Folder reordering implementation.
 * @param moveFolderToParent - Folder move implementation.
 * @returns Promise resolving when the action finishes.
 *
 * @private function of AgentsList
 */
async function executeFolderDropAction(
    action: FolderDropAction | null,
    reorderFolders: (draggedId: number, targetId: number) => Promise<void>,
    moveFolderToParent: (folderId: number, targetParentId: number | null) => Promise<void>,
): Promise<void> {
    if (!action) {
        return;
    }

    if (action.type === 'REORDER_FOLDER') {
        await reorderFolders(action.draggedFolderId, action.targetFolderId);
        return;
    }

    await moveFolderToParent(action.draggedFolderId, action.targetParentId);
}

/**
 * Creates a stable anchor point for context menus.
 *
 * @param event - Mouse event that opened the menu.
 * @returns Cursor position used as the menu anchor.
 *
 * @private function of AgentsList
 */
function createContextMenuAnchorPoint(event: MouseEvent<HTMLDivElement>): { x: number; y: number } {
    return { x: event.clientX, y: event.clientY };
}

/**
 * Owns the interactive organization caches together with their background synchronization lifecycle.
 *
 * @private function of AgentsList
 */
function useAgentsListSyncState({
    initialAgents,
    initialFolders,
    routeSyncKey,
}: UseAgentsListSyncStateProps): AgentsListSyncState {
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

/**
 * Normalizes stale folder URLs after synchronization invalidates the current folder path.
 *
 * @private function of AgentsList
 */
function useAgentsListFolderPathRecovery({
    currentFolderId,
    folderPathSegments,
    lastSyncedRouteKey,
    folderQuery,
    pathname,
    routeSyncKey,
    router,
    searchParamsSnapshot,
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

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [
        currentFolderId,
        folderPathSegments,
        folderQuery,
        lastSyncedRouteKey,
        pathname,
        routeSyncKey,
        router,
        searchParamsSnapshot,
    ]);
}

/**
 * Owns organization persistence handlers shared across list interactions.
 *
 * @private function of AgentsList
 */
function useAgentsListOrganizationActions({
    agents,
    childrenByParentId,
    folders,
    setAgents,
    setFolders,
    synchronizeAfterMutation,
    visibleAgents,
    visibleFolders,
}: UseAgentsListOrganizationActionsProps): AgentsListOrganizationActions {
    const persistOrganizationUpdates = useCallback(
        async (payload: AgentOrganizationUpdatePayload) => {
            const response = await fetch(AGENT_ORGANIZATION_SYNC_API_PATH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const responseBody = await response.json().catch(() => ({}));
                throw new Error(responseBody.error || 'Failed to update organization.');
            }

            synchronizeAfterMutation('organization-update');
        },
        [synchronizeAfterMutation],
    );

    const reorderFolders = useCallback(
        async (draggedId: number, targetId: number) => {
            const updatedFolders = createReorderedFolderUpdates(folders, visibleFolders, draggedId, targetId);
            if (!updatedFolders) {
                return;
            }

            setFolders((prev) => applyFolderUpdates(prev, updatedFolders));
            await persistOrganizationUpdates(buildFolderOrganizationUpdates(updatedFolders));
        },
        [folders, persistOrganizationUpdates, setFolders, visibleFolders],
    );

    const reorderAgents = useCallback(
        async (draggedId: string, targetId: string) => {
            const updates = createReorderedAgentUpdates(agents, visibleAgents, draggedId, targetId);
            if (!updates) {
                return;
            }

            setAgents((prev) => applyAgentUpdates(prev, updates));
            await persistOrganizationUpdates(buildAgentOrganizationUpdates(updates));
        },
        [agents, persistOrganizationUpdates, setAgents, visibleAgents],
    );

    const moveFolderToParent = useCallback(
        async (folderId: number, targetParentId: number | null) => {
            const movePlan = createFolderMovePlan(folders, childrenByParentId, folderId, targetParentId);
            if (movePlan.type === 'NO_OP') {
                return;
            }

            if (movePlan.type === 'INVALID_PARENT') {
                await showAlert({
                    title: 'Invalid move',
                    message: 'Cannot move a folder into one of its subfolders.',
                }).catch(() => undefined);
                return;
            }

            setFolders((prev) => applyFolderUpdates(prev, movePlan.updates));
            await persistOrganizationUpdates(buildFolderOrganizationUpdates(movePlan.updates));
        },
        [childrenByParentId, folders, persistOrganizationUpdates, setFolders],
    );

    const moveAgentToFolder = useCallback(
        async (identifier: string, targetFolderId: number | null) => {
            const updates = createAgentMoveUpdates(agents, identifier, targetFolderId);
            if (!updates) {
                return;
            }

            setAgents((prev) => applyAgentUpdates(prev, updates));
            await persistOrganizationUpdates(buildAgentOrganizationUpdates(updates));
        },
        [agents, persistOrganizationUpdates, setAgents],
    );

    return {
        moveAgentToFolder,
        moveFolderToParent,
        reorderAgents,
        reorderFolders,
    };
}

/**
 * Owns the folder editor, deletion, and visibility flows for `AgentsList`.
 *
 * @private function of AgentsList
 */
function useAgentsListFolderState({
    agents,
    breadcrumbFolders,
    childrenByParentId,
    currentFolderId,
    folders,
    formatText,
    navigateToFolder,
    setAgents,
    setFolders,
    synchronizeAfterMutation,
}: UseAgentsListFolderStateProps): AgentsListFolderState {
    const [folderEditDialogState, setFolderEditDialogState] = useState<FolderEditDialogState | null>(null);
    const [isFolderEditSubmitting, setIsFolderEditSubmitting] = useState<boolean>(false);

    const handleCreateFolder = useCallback(() => {
        setFolderEditDialogState(createFolderEditDialogState('CREATE', null));
    }, []);

    const handleRenameFolder = useCallback(
        (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            setFolderEditDialogState(createFolderEditDialogState('EDIT', folderId, folder));
        },
        [folders],
    );

    const createFolderFromDialog = useCallback(
        async (values: FolderEditValues) => {
            const response = await fetch('/api/agent-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
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
        },
        [currentFolderId, setFolders, synchronizeAfterMutation],
    );

    const updateFolderFromDialog = useCallback(
        async (folderId: number, values: FolderEditValues) => {
            const response = await fetch(`/api/agent-folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
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
        },
        [breadcrumbFolders, currentFolderId, folders, navigateToFolder, setFolders, synchronizeAfterMutation],
    );

    const handleSubmitFolderEdit = useCallback(
        async (values: FolderEditValues) => {
            if (!folderEditDialogState) {
                return;
            }

            const { errorMessage, normalizedValues } = normalizeFolderEditValues(values);
            if (errorMessage) {
                await showAlert({
                    title: 'Invalid name',
                    message: errorMessage,
                }).catch(() => undefined);
                return;
            }

            const dialogMode = folderEditDialogState.mode;

            setIsFolderEditSubmitting(true);
            try {
                if (dialogMode === 'CREATE') {
                    await createFolderFromDialog(normalizedValues);
                    return;
                }

                const folderId = folderEditDialogState.folderId;
                if (folderId === null) {
                    return;
                }

                await updateFolderFromDialog(folderId, normalizedValues);
            } catch (error) {
                await showAlert({
                    title: resolveFolderEditFailureTitle(dialogMode),
                    message: error instanceof Error ? error.message : 'Failed to update folder.',
                }).catch(() => undefined);
            } finally {
                setIsFolderEditSubmitting(false);
            }
        },
        [createFolderFromDialog, folderEditDialogState, updateFolderFromDialog],
    );

    const handleCloseFolderEditDialog = useCallback(() => {
        if (isFolderEditSubmitting) {
            return;
        }

        setFolderEditDialogState(null);
    }, [isFolderEditSubmitting]);

    const handleDeleteFolder = useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const subfolderCount = descendantContext.ids.length - 1;
            const affectedAgentCount = agents.filter(
                (agent) => agent.folderId !== null && descendantContext.idSet.has(agent.folderId),
            ).length;

            const confirmed = await showConfirm({
                title: 'Delete folder',
                message: `${formatText('Delete folder')} "${folder.name}"? ${formatText(
                    'It will move',
                )} ${affectedAgentCount} ${formatText('agents')} and ${subfolderCount} subfolders to the Recycle Bin.`,
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

                setFolders((prev) => prev.filter((item) => !descendantContext.idSet.has(item.id)));
                setAgents((prev) =>
                    prev.filter((agent) => agent.folderId === null || !descendantContext.idSet.has(agent.folderId)),
                );
                synchronizeAfterMutation('delete-folder');

                if (currentFolderId !== null && descendantContext.idSet.has(currentFolderId)) {
                    navigateToFolder(null);
                }
            } catch (error) {
                await showAlert({
                    title: 'Delete failed',
                    message: error instanceof Error ? error.message : 'Failed to delete folder.',
                }).catch(() => undefined);
            }
        },
        [
            agents,
            childrenByParentId,
            currentFolderId,
            folders,
            formatText,
            navigateToFolder,
            setAgents,
            setFolders,
            synchronizeAfterMutation,
        ],
    );

    const handleSetFolderVisibility = useCallback(
        async (folderId: number, visibility: AgentVisibility) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);

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
                        agent.folderId !== null && descendantContext.idSet.has(agent.folderId)
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
        },
        [childrenByParentId, folders, setAgents, synchronizeAfterMutation],
    );

    const handleRequestFolderVisibilityUpdate = useCallback(
        async (folderId: number) => {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                return;
            }

            const descendantContext = createFolderDescendantContext(folderId, childrenByParentId);
            const affectedAgents = agents.filter(
                (agent) => agent.folderId !== null && descendantContext.idSet.has(agent.folderId),
            );
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
        },
        [agents, childrenByParentId, folders, formatText, handleSetFolderVisibility],
    );

    return {
        folderEditDialogState,
        handleCloseFolderEditDialog,
        handleCreateFolder,
        handleDeleteFolder,
        handleRenameFolder,
        handleRequestFolderVisibilityUpdate,
        handleSubmitFolderEdit,
        isFolderEditSubmitting,
    };
}

/**
 * Owns agent deletion, visibility, and rename side effects for `AgentsList`.
 *
 * @private function of AgentsList
 */
function useAgentsListAgentState({
    agents,
    formatText,
    setAgents,
    synchronizeAfterMutation,
}: UseAgentsListAgentStateProps): AgentsListAgentState {
    const handleDelete = useCallback(
        async (agentIdentifier: string) => {
            const agent = findAgentByIdentifier(agents, agentIdentifier);
            if (!agent) {
                return;
            }

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
                    setAgents((prev) => prev.filter((item) => getAgentIdentifier(item) !== agentIdentifier));
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
        },
        [agents, formatText, setAgents, synchronizeAfterMutation],
    );

    const handleRequestAgentVisibilityChange = useCallback(
        async (agentIdentifier: string) => {
            const agent = findAgentByIdentifier(agents, agentIdentifier);
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
                        prev.map((item) =>
                            getAgentIdentifier(item) === agentIdentifier ? { ...item, visibility: selectedVisibility } : item,
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
        },
        [agents, formatText, setAgents, synchronizeAfterMutation],
    );

    const handleContextMenuAgentRenamed = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            setAgents((prev) =>
                prev.map((agent) => {
                    if (getAgentIdentifier(agent) !== payload.previousIdentifier) {
                        return agent;
                    }

                    return { ...agent, ...payload.agent };
                }),
            );
            synchronizeAfterMutation('rename-agent');
        },
        [setAgents, synchronizeAfterMutation],
    );

    return {
        handleContextMenuAgentRenamed,
        handleDelete,
        handleRequestAgentVisibilityChange,
    };
}

/**
 * Owns context-menu and QR-code overlay state for `AgentsList`.
 *
 * @private function of AgentsList
 */
function useAgentsListOverlayState(): AgentsListOverlayState {
    const [contextMenuState, setContextMenuState] = useState<AgentContextMenuState | null>(null);
    const [folderContextMenuState, setFolderContextMenuState] = useState<FolderContextMenuState | null>(null);
    const [qrCodeAgent, setQrCodeAgent] = useState<AgentOrganizationAgent | null>(null);

    const handleAgentContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, agent: AgentOrganizationAgent) => {
        event.preventDefault();
        setFolderContextMenuState(null);
        setContextMenuState({ agent, anchorPoint: createContextMenuAnchorPoint(event) });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenuState(null);
    }, []);

    const handleFolderContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, folder: AgentOrganizationFolder) => {
        event.preventDefault();
        setContextMenuState(null);
        setFolderContextMenuState({ folderId: folder.id, anchorPoint: createContextMenuAnchorPoint(event) });
    }, []);

    const handleCloseFolderContextMenu = useCallback(() => {
        setFolderContextMenuState(null);
    }, []);

    const handleShowQrCode = useCallback(() => {
        if (contextMenuState) {
            setQrCodeAgent(contextMenuState.agent);
        }
    }, [contextMenuState]);

    const handleCloseQrCode = useCallback(() => {
        setQrCodeAgent(null);
    }, []);

    return {
        contextMenuState,
        folderContextMenuState,
        handleAgentContextMenu,
        handleCloseContextMenu,
        handleCloseFolderContextMenu,
        handleCloseQrCode,
        handleFolderContextMenu,
        handleShowQrCode,
        qrCodeAgent,
    };
}

/**
 * Owns drag-and-drop state and delegates each drop outcome to focused organization handlers.
 *
 * @private function of AgentsList
 */
function useAgentsListDragState({
    agents,
    canOrganize,
    folders,
    moveAgentToFolder,
    moveFolderToParent,
    reorderAgents,
    reorderFolders,
    synchronizeOrganizationState,
}: UseAgentsListDragStateProps): AgentsListDragState {
    const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

    const activeAgent = useMemo(() => resolveDraggedAgent(activeDragItem, agents), [activeDragItem, agents]);
    const activeFolder = useMemo(() => resolveDraggedFolder(activeDragItem, folders), [activeDragItem, folders]);

    const resetDragState = useCallback(() => {
        setActiveDragItem(null);
        setDropIndicator(null);
    }, []);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            if (!canOrganize) {
                return;
            }

            const dragData = event.active.data.current as DragItem | undefined;
            if (dragData) {
                setActiveDragItem(dragData);
            }
        },
        [canOrganize],
    );

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            if (!canOrganize) {
                return;
            }

            setDropIndicator(resolveFolderDropIndicator(event));
        },
        [canOrganize],
    );

    const handleAgentDrop = useCallback(
        async (dragData: DragItem, overData: DropTargetData) => {
            await executeAgentDropAction(resolveAgentDropAction(dragData, overData), reorderAgents, moveAgentToFolder);
        },
        [moveAgentToFolder, reorderAgents],
    );

    const handleFolderDrop = useCallback(
        async (
            dragData: DragItem,
            overData: DropTargetData,
            overId: string | number,
            currentIndicator: DropIndicator | null,
        ) => {
            await executeFolderDropAction(
                resolveFolderDropAction(dragData, overData, overId, currentIndicator),
                reorderFolders,
                moveFolderToParent,
            );
        },
        [moveFolderToParent, reorderFolders],
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const currentIndicator = dropIndicator;
            const dragData = event.active.data.current as DragItem | undefined;
            const overData = event.over?.data.current as DropTargetData | undefined;

            resetDragState();

            if (!canOrganize || !dragData || !event.over || !overData) {
                return;
            }

            try {
                if (dragData.type === 'AGENT') {
                    await handleAgentDrop(dragData, overData);
                    return;
                }

                if (dragData.type === 'FOLDER') {
                    await handleFolderDrop(dragData, overData, event.over.id, currentIndicator);
                }
            } catch (error) {
                await showAlert({
                    title: 'Update failed',
                    message: error instanceof Error ? error.message : 'Failed to update organization.',
                }).catch(() => undefined);
                void synchronizeOrganizationState('error-recovery');
            }
        },
        [
            canOrganize,
            dropIndicator,
            handleAgentDrop,
            handleFolderDrop,
            resetDragState,
            synchronizeOrganizationState,
        ],
    );

    const handleDragCancel = useCallback(() => {
        resetDragState();
    }, [resetDragState]);

    return {
        activeAgent,
        activeDragItem,
        activeFolder,
        dropIndicator,
        handleDragCancel,
        handleDragEnd,
        handleDragOver,
        handleDragStart,
    };
}

/**
 * Builds all state, derived data, and interaction handlers used by `AgentsList`.
 *
 * @param props - Current AgentsList props.
 * @returns State slices and handlers consumed by the thin AgentsList facade.
 *
 * @private function of AgentsList
 */
export function useAgentsListState(props: UseAgentsListStateProps) {
    const {
        agents: initialAgents,
        folders: initialFolders,
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
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(() => normalizePublicUrl(publicUrl), [publicUrl]);
    const publicUrlHost = useMemo(() => resolvePublicUrlHost(normalizedPublicUrl), [normalizedPublicUrl]);
    const viewMode = resolveHomeViewMode(searchParams.get('view'));
    const shouldRefreshFederatedAgents = showFederatedAgents && viewMode !== 'LIST';
    const { federatedAgents, federatedServersStatus } = useFederatedAgents(
        showFederatedAgents,
        initialExternalAgents,
        shouldRefreshFederatedAgents,
    );
    const isTouchInput = useIsTouchInput();
    const allowFullCardDrag = canOrganize && viewMode === 'LIST' && !isTouchInput;
    const {
        agents,
        folders,
        lastSyncedRouteKey,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
        synchronizeOrganizationState,
    } = useAgentsListSyncState({
        initialAgents,
        initialFolders,
        routeSyncKey,
    });
    const folderPathSegments = parseFolderPath(folderQuery);
    const currentFolderId = useMemo(
        () => resolveFolderIdFromPath(folders, folderPathSegments),
        [folders, folderPathSegments],
    );
    const folderMaps = useMemo(() => buildFolderMaps(folders), [folders]);
    const allAgentsLabel = formatText('All Agents');
    const localAgentsLabel = formatText('Local Agents');
    const breadcrumbFolders = useMemo(
        () => getFolderPathSegments(currentFolderId, folderMaps.folderById),
        [currentFolderId, folderMaps.folderById],
    );
    const parentFolderInfo = useMemo(
        () => resolveParentFolderInfo(currentFolderId, folderMaps.folderById, allAgentsLabel),
        [allAgentsLabel, currentFolderId, folderMaps.folderById],
    );
    const visibleFolders = useMemo(() => getVisibleFolders(folders, currentFolderId), [folders, currentFolderId]);
    const visibleAgents = useMemo(() => getVisibleAgents(agents, currentFolderId), [agents, currentFolderId]);
    const officeVisibleFolderIds = useMemo(
        () => createOfficeVisibleFolderIdSet(currentFolderId, folderMaps.childrenByParentId),
        [currentFolderId, folderMaps.childrenByParentId],
    );
    const officeAgents = useMemo(() => getOfficeAgents(agents, officeVisibleFolderIds), [agents, officeVisibleFolderIds]);
    const officeFolders = useMemo(() => getOfficeFolders(folders, officeVisibleFolderIds), [folders, officeVisibleFolderIds]);
    const agentCount = resolveAgentCount(viewMode, visibleAgents.length, officeAgents.length, agents.length);
    useAgentsListFolderPathRecovery({
        currentFolderId,
        folderPathSegments,
        lastSyncedRouteKey,
        folderQuery,
        pathname,
        routeSyncKey,
        router,
        searchParamsSnapshot,
    });
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
        () => visibleAgents.map((agent) => getAgentDragId(getAgentIdentifier(agent))),
        [visibleAgents],
    );

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
    const setViewMode = useCallback(
        (mode: HomeViewMode) => {
            const params = new URLSearchParams(searchParams.toString());
            const viewQueryValue = getHomeViewQueryValue(mode);

            if (viewQueryValue === null) {
                params.delete('view');
            } else {
                params.set('view', viewQueryValue);
            }

            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    /**
     * Updates the folder query param for navigation.
     *
     * @param folderId - Folder to navigate into.
     * @param overrideFolders - Optional folder list to use for path building.
     */
    const navigateToFolder = useCallback(
        (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => {
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
        },
        [folders, router, searchParams],
    );
    const organizationActions = useAgentsListOrganizationActions({
        agents,
        childrenByParentId: folderMaps.childrenByParentId,
        folders,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
        visibleAgents,
        visibleFolders,
    });
    const folderState = useAgentsListFolderState({
        agents,
        breadcrumbFolders,
        childrenByParentId: folderMaps.childrenByParentId,
        currentFolderId,
        folders,
        formatText,
        navigateToFolder,
        setAgents,
        setFolders,
        synchronizeAfterMutation,
    });
    const agentState = useAgentsListAgentState({
        agents,
        formatText,
        setAgents,
        synchronizeAfterMutation,
    });
    const overlayState = useAgentsListOverlayState();
    const dragState = useAgentsListDragState({
        agents,
        canOrganize,
        folders,
        moveAgentToFolder: organizationActions.moveAgentToFolder,
        moveFolderToParent: organizationActions.moveFolderToParent,
        reorderAgents: organizationActions.reorderAgents,
        reorderFolders: organizationActions.reorderFolders,
        synchronizeOrganizationState,
    });

    const getFolderPreviewAgents = useCallback(
        (folderId: number): AgentBasicInformation[] => {
            const descendantContext = createFolderDescendantContext(folderId, folderMaps.childrenByParentId);
            const orderedAgents = sortBySortOrder(agents, (agent) => agent.agentName);
            return pickPreviewAgents(orderedAgents, descendantContext.idSet, 4);
        },
        [agents, folderMaps.childrenByParentId],
    );

    const dragAgentLabel = formatText('Drag agent');
    const dragFolderLabel = formatText('Drag folder');

    const headingTitle = resolveHeadingTitle(viewMode, currentFolderId, folderMaps.folderById, localAgentsLabel);
    const contextMenuAgent = overlayState.contextMenuState?.agent ?? null;
    const contextMenuFolder = resolveContextMenuFolder(folders, overlayState.folderContextMenuState);
    const contextMenuIdentifier = contextMenuAgent ? getAgentIdentifier(contextMenuAgent) : '';
    const contextMenuAgentUrl = contextMenuAgent ? buildAgentUrl(contextMenuIdentifier) : '';
    const contextMenuAgentEmail = contextMenuAgent ? buildAgentEmail(contextMenuIdentifier) : '';
    const contextMenuFolderContext = useMemo<AgentFolderContext | null>(() => {
        if (!contextMenuAgent) {
            return null;
        }

        return buildAgentFolderContext(contextMenuAgent.folderId ?? null, folderMaps.folderById);
    }, [contextMenuAgent, folderMaps.folderById]);
    const qrCodeIdentifier = overlayState.qrCodeAgent ? getAgentIdentifier(overlayState.qrCodeAgent) : '';
    const qrCodeAgentUrl = overlayState.qrCodeAgent ? buildAgentUrl(qrCodeIdentifier) : '';
    const qrCodeAgentEmail = overlayState.qrCodeAgent ? buildAgentEmail(qrCodeIdentifier) : '';

    return {
        activeAgent: dragState.activeAgent,
        activeDragItemType: dragState.activeDragItem?.type ?? null,
        activeFolder: dragState.activeFolder,
        agentCount,
        agents,
        allAgentsLabel,
        allowFullCardDrag,
        breadcrumbFolders,
        contextMenuAgent,
        contextMenuAgentAnchorPoint: overlayState.contextMenuState?.anchorPoint ?? null,
        contextMenuAgentEmail,
        contextMenuAgentUrl,
        contextMenuFolder,
        contextMenuFolderAnchorPoint: overlayState.folderContextMenuState?.anchorPoint ?? null,
        contextMenuFolderContext,
        contextMenuIdentifier,
        currentFolderId,
        dragAgentLabel,
        dragFolderLabel,
        dropIndicator: dragState.dropIndicator,
        federatedAgents,
        federatedServersStatus: federatedServersStatus as Record<string, FederatedServerStatus>,
        folderEditDialogInitialValues: folderState.folderEditDialogState?.initialValues ?? null,
        folderEditDialogMode: folderState.folderEditDialogState?.mode ?? null,
        folders,
        getAgentDragId,
        getFolderDragId,
        getFolderPreviewAgents,
        handleAgentContextMenu: overlayState.handleAgentContextMenu,
        handleCloseContextMenu: overlayState.handleCloseContextMenu,
        handleCloseFolderContextMenu: overlayState.handleCloseFolderContextMenu,
        handleCloseFolderEditDialog: folderState.handleCloseFolderEditDialog,
        handleCloseQrCode: overlayState.handleCloseQrCode,
        handleContextMenuAgentRenamed: agentState.handleContextMenuAgentRenamed,
        handleCreateFolder: folderState.handleCreateFolder,
        handleDelete: agentState.handleDelete,
        handleDeleteFolder: folderState.handleDeleteFolder,
        handleDragCancel: dragState.handleDragCancel,
        handleDragEnd: dragState.handleDragEnd,
        handleDragOver: dragState.handleDragOver,
        handleDragStart: dragState.handleDragStart,
        handleFolderContextMenu: overlayState.handleFolderContextMenu,
        handleRenameFolder: folderState.handleRenameFolder,
        handleRequestAgentVisibilityChange: agentState.handleRequestAgentVisibilityChange,
        handleRequestFolderVisibilityUpdate: folderState.handleRequestFolderVisibilityUpdate,
        handleShowQrCode: overlayState.handleShowQrCode,
        handleSubmitFolderEdit: folderState.handleSubmitFolderEdit,
        headingTitle,
        isFolderEditSubmitting: folderState.isFolderEditSubmitting,
        navigateToFolder,
        officeAgents,
        officeFolders,
        parentFolderInfo,
        qrCodeAgent: overlayState.qrCodeAgent,
        qrCodeAgentEmail,
        qrCodeAgentUrl,
        sensors,
        setViewMode,
        viewMode,
        visibleAgentDragIds,
        visibleAgents,
        visibleFolderDragIds,
        visibleFolders,
    };
}
