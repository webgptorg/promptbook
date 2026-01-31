// Client Component for rendering and deleting agents
'use client';

import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { string_url } from '@promptbook-local/types';
import { ArrowUp, FolderPlusIcon, Grid, Network, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AddAgentButton } from '../../app/AddAgentButton';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import { AgentCard } from './AgentCard';
import { AgentsGraph } from './AgentsGraph';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
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

/**
 * Local agent payload with optional federation metadata.
 */
type AgentWithVisibility = AgentOrganizationAgent & {
    serverUrl?: string;
};

/**
 * Drag metadata for folders and agents.
 */
type DragItem = {
    type: 'AGENT' | 'FOLDER';
    identifier: string;
    parentId: number | null;
};

/**
 * Drop placement intent derived from cursor position.
 */
type DropIntent = 'before' | 'after' | 'inside';

/**
 * Drag metadata for breadcrumb drop targets.
 */
type BreadcrumbDropTargetData = {
    type: 'BREADCRUMB';
    folderId: number | null;
};

/**
 * Drop indicator metadata for live folder moves.
 */
type DropIndicator = {
    id: UniqueIdentifier;
    intent: DropIntent;
};

const AGENT_DRAG_ID_PREFIX = 'agent:';
const FOLDER_DRAG_ID_PREFIX = 'folder:';
const BREADCRUMB_DRAG_ID_PREFIX = 'breadcrumb:';

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
 * Builds a drag identifier for breadcrumb drop targets.
 *
 * @param folderId - Folder id represented by the breadcrumb.
 * @returns Drag identifier string.
 */
const getBreadcrumbDragId = (folderId: number | null) =>
    buildDragId(BREADCRUMB_DRAG_ID_PREFIX, folderId === null ? 'root' : String(folderId));

/**
 * Provides droppable state for breadcrumb-style drop targets.
 *
 * @param folderId - Folder id represented by the drop target.
 * @param canOrganize - Whether drag-and-drop organization is enabled.
 * @returns Droppable state for the target.
 */
function useBreadcrumbDropTarget(folderId: number | null, canOrganize: boolean) {
    return useDroppable({
        id: getBreadcrumbDragId(folderId),
        data: {
            type: 'BREADCRUMB',
            folderId,
        } satisfies BreadcrumbDropTargetData,
        disabled: !canOrganize,
    });
}

/**
 * Determines the drop intent based on active and target rectangles.
 *
 * @param activeRect - Active drag rectangle.
 * @param overRect - Target drop rectangle.
 * @returns Drop intent for inside/before/after placement.
 */
const getDropIntentFromRects = (activeRect: ClientRect | null, overRect: ClientRect): DropIntent => {
    if (!activeRect) {
        return 'inside';
    }
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const insideTop = overRect.top + overRect.height / 4;
    const insideBottom = overRect.top + (overRect.height * 3) / 4;
    if (activeCenterY > insideTop && activeCenterY < insideBottom) {
        return 'inside';
    }
    return activeCenterY >= insideBottom ? 'after' : 'before';
};

/**
 * Props for sortable agent cards.
 */
type SortableAgentCardProps = {
    /**
     * Agent to render.
     */
    readonly agent: AgentOrganizationAgent;
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Whether the current user is an admin.
     */
    readonly isAdmin: boolean;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
    /**
     * Active drag type for visual indicators.
     */
    readonly activeDragType: DragItem['type'] | null;
    /**
     * Delete handler for the agent.
     */
    readonly onDelete: (agentIdentifier: string) => void;
    /**
     * Clone handler for the agent.
     */
    readonly onClone: (agentIdentifier: string) => void;
    /**
     * Visibility toggle handler for the agent.
     */
    readonly onToggleVisibility: (agentIdentifier: string) => void;
};

/**
 * Renders a sortable agent card with drag affordances.
 */
function SortableAgentCard({
    agent,
    publicUrl,
    isAdmin,
    canOrganize,
    activeDragType,
    onDelete,
    onClone,
    onToggleVisibility,
}: SortableAgentCardProps) {
    const agentIdentifier = agent.permanentId || agent.agentName;
    const dragId = getAgentDragId(agentIdentifier);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: dragId,
        data: {
            type: 'AGENT',
            identifier: agentIdentifier,
            parentId: agent.folderId ?? null,
        } satisfies DragItem,
        disabled: !canOrganize,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const isDropTarget = isOver && activeDragType === 'AGENT';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${canOrganize ? 'cursor-grab active:cursor-grabbing select-none touch-none' : ''} ${
                isDragging ? 'opacity-0' : ''
            } ${isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''}`}
            {...attributes}
            {...listeners}
        >
            <AgentCard
                agent={agent}
                publicUrl={publicUrl}
                href={`/agents/${encodeURIComponent(agentIdentifier)}`}
                isAdmin={isAdmin}
                onDelete={onDelete}
                onClone={onClone}
                onToggleVisibility={onToggleVisibility}
                visibility={agent.visibility}
            />
        </div>
    );
}

/**
 * Props for sortable folder cards.
 */
type SortableFolderCardProps = {
    /**
     * Folder to render.
     */
    readonly folder: AgentOrganizationFolder;
    /**
     * Preview agents for the folder.
     */
    readonly previewAgents: AgentBasicInformation[];
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
    /**
     * Active drag type for visual indicators.
     */
    readonly activeDragType: DragItem['type'] | null;
    /**
     * Current drop indicator state.
     */
    readonly dropIndicator: DropIndicator | null;
    /**
     * Open handler for the folder.
     */
    readonly onOpen: () => void;
    /**
     * Rename handler for the folder.
     */
    readonly onRename?: () => void;
    /**
     * Delete handler for the folder.
     */
    readonly onDelete?: () => void;
};

/**
 * Renders a sortable folder card with drop state styling.
 */
function SortableFolderCard({
    folder,
    previewAgents,
    publicUrl,
    canOrganize,
    activeDragType,
    dropIndicator,
    onOpen,
    onRename,
    onDelete,
}: SortableFolderCardProps) {
    const dragId = getFolderDragId(folder.id);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: dragId,
        data: {
            type: 'FOLDER',
            identifier: String(folder.id),
            parentId: folder.parentId ?? null,
        } satisfies DragItem,
        disabled: !canOrganize,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const isDropTarget = isOver && activeDragType === 'AGENT';
    const isInsideTarget =
        activeDragType === 'FOLDER' && dropIndicator?.id === dragId && dropIndicator.intent === 'inside';
    const isReorderTarget =
        activeDragType === 'FOLDER' && dropIndicator?.id === dragId && dropIndicator.intent !== 'inside';
    const dropClasses =
        isInsideTarget || isDropTarget
            ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-white bg-emerald-50/40'
            : isReorderTarget
              ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white'
              : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${canOrganize ? 'cursor-grab active:cursor-grabbing select-none touch-none' : ''} ${
                isDragging ? 'opacity-0' : ''
            } ${dropClasses}`}
            {...attributes}
            {...listeners}
        >
            <FolderCard
                folderName={folder.name}
                previewAgents={previewAgents}
                publicUrl={publicUrl}
                onOpen={onOpen}
                onRename={onRename}
                onDelete={onDelete}
            />
        </div>
    );
}

/**
 * Props for breadcrumb drop targets.
 */
type BreadcrumbDropTargetProps = {
    /**
     * Label for the breadcrumb.
     */
    readonly label: string;
    /**
     * Folder id represented by the breadcrumb.
     */
    readonly folderId: number | null;
    /**
     * Click handler for navigation.
     */
    readonly onClick: () => void;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
};

/**
 * Renders a breadcrumb button that accepts drag-and-drop.
 */
function BreadcrumbDropTarget({ label, folderId, onClick, canOrganize }: BreadcrumbDropTargetProps) {
    const { isOver, setNodeRef } = useBreadcrumbDropTarget(folderId, canOrganize);

    return (
        <button
            type="button"
            ref={setNodeRef}
            onClick={onClick}
            className={`transition-colors ${isOver && canOrganize ? 'text-blue-700 bg-blue-50/70 rounded px-1 -mx-1' : 'hover:text-blue-600'}`}
        >
            {label}
        </button>
    );
}

/**
 * Props for the parent folder navigation card.
 */
type ParentFolderCardProps = {
    /**
     * Label shown for the parent folder.
     */
    readonly label: string;
    /**
     * Folder id represented by the parent card.
     */
    readonly folderId: number | null;
    /**
     * Click handler for navigating to the parent folder.
     */
    readonly onOpen: () => void;
    /**
     * Whether drag-and-drop organization is enabled.
     */
    readonly canOrganize: boolean;
};

/**
 * Renders a card for navigating to the parent folder with drop support.
 */
function ParentFolderCard({ label, folderId, onOpen, canOrganize }: ParentFolderCardProps) {
    const { isOver, setNodeRef } = useBreadcrumbDropTarget(folderId, canOrganize);
    const isDropTarget = isOver && canOrganize;

    return (
        <button
            type="button"
            ref={setNodeRef}
            onClick={onOpen}
            className="block h-full w-full text-left"
        >
            <FileCard
                className={`flex h-full items-center gap-3 border-blue-200 bg-blue-50/60 hover:border-blue-300 ${
                    isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''
                }`}
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-100 border border-blue-200 text-blue-700">
                    <ArrowUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-blue-700">Parent folder</p>
                    <h3 className="text-sm font-semibold text-gray-900 truncate" title={label}>
                        {label}
                    </h3>
                </div>
            </FileCard>
        </button>
    );
}

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
};

/**
 * Renders the agents list with folder navigation and graph view toggles.
 */
export function AgentsList(props: AgentsListProps) {
    const { agents: initialAgents, folders: initialFolders, isAdmin, canOrganize, publicUrl, showFederatedAgents } =
        props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [agents, setAgents] = useState<AgentOrganizationAgent[]>(Array.from(initialAgents));
    const [folders, setFolders] = useState<AgentOrganizationFolder[]>(Array.from(initialFolders));
    const [federatedAgents, setFederatedAgents] = useState<AgentWithVisibility[]>([]);
    const [federatedServersStatus, setFederatedServersStatus] = useState<
        Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>
    >({});
    const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

    const viewMode = searchParams.get('view') === 'graph' ? 'GRAPH' : 'LIST';
    const showFederatedAgentsInGraph = showFederatedAgents && viewMode === 'GRAPH';
    const folderPathSegments = parseFolderPath(searchParams.get('folder'));
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
            parentFolderId === null ? 'All Agents' : folderMaps.folderById.get(parentFolderId)?.name || 'All Agents';
        return { id: parentFolderId, label: parentFolderName };
    }, [currentFolderId, folderMaps]);

    const visibleFolders = useMemo(
        () =>
            sortBySortOrder(
                folders.filter((folder) => (folder.parentId ?? null) === (currentFolderId ?? null)),
                (folder) => folder.name,
            ),
        [folders, currentFolderId],
    );
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
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
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

    useEffect(() => {
        if (!showFederatedAgentsInGraph) {
            setFederatedAgents([]);
            setFederatedServersStatus({});
            return;
        }

        let isCancelled = false;

        const fetchFederatedAgents = async () => {
            try {
                const response = await fetch('/api/federated-agents');
                if (!response.ok) {
                    return;
                }
                const data = await response.json();
                const federatedServers: string[] = data.federatedServers || [];

                for (const serverUrl of federatedServers) {
                    if (isCancelled) {
                        break;
                    }

                    const normalizedUrl = serverUrl.replace(/\/$/, '');

                    setFederatedServersStatus((prev) => ({
                        ...prev,
                        [normalizedUrl]: { status: 'loading' },
                    }));

                    try {
                        const agentsResponse = await fetch(`${normalizedUrl}/api/agents`);
                        if (agentsResponse.ok) {
                            const agentsData = await agentsResponse.json();
                            if (isCancelled) {
                                break;
                            }
                            const newFederatedAgents = (agentsData.agents || []).map((agent: AgentWithVisibility) => ({
                                ...agent,
                                visibility: 'PUBLIC',
                                serverUrl: normalizedUrl,
                            }));
                            setFederatedAgents((prev) => {
                                const filteredPrev = prev.filter((a) => a.serverUrl !== normalizedUrl);
                                return [...filteredPrev, ...newFederatedAgents];
                            });
                            setFederatedServersStatus((prev) => ({
                                ...prev,
                                [normalizedUrl]: { status: 'success' },
                            }));
                        } else {
                            throw new Error(`Failed to fetch agents (Status: ${agentsResponse.status})`);
                        }
                    } catch (error) {
                        console.error(`Failed to fetch agents from ${serverUrl}`, error);
                        setFederatedServersStatus((prev) => ({
                            ...prev,
                            [normalizedUrl]: {
                                status: 'error',
                                error: error instanceof Error ? error.message : 'Unknown error',
                            },
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch federated servers', error);
            }
        };

        fetchFederatedAgents();

        return () => {
            isCancelled = true;
        };
    }, [showFederatedAgentsInGraph]);
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
            alert('Cannot move a folder into one of its subfolders.');
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
        setAgents((prev) => prev.map((item) => updatedMap.get(item.permanentId || item.agentName) || item));

        await persistOrganizationUpdates({
            agents: updates.map((item) => ({
                identifier: item.permanentId || item.agentName,
                folderId: item.folderId ?? null,
                sortOrder: item.sortOrder,
            })),
        });
    };

    /**
     * Creates a new folder under the current folder.
     */
    const handleCreateFolder = async () => {
        const name = window.prompt('Folder name');
        if (!name) {
            return;
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            alert('Folder name cannot be empty.');
            return;
        }

        if (trimmedName.includes('/')) {
            alert('Folder name cannot include "/".');
            return;
        }

        try {
            const response = await fetch('/api/agent-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, parentId: currentFolderId ?? null }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create folder.');
            }
            setFolders((prev) => [...prev, data.folder]);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create folder.');
        }
    };

    /**
     * Renames an existing folder.
     *
     * @param folderId - Folder id to rename.
     */
    const handleRenameFolder = async (folderId: number) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) {
            return;
        }

        const name = window.prompt('Rename folder', folder.name);
        if (!name) {
            return;
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            alert('Folder name cannot be empty.');
            return;
        }

        if (trimmedName.includes('/')) {
            alert('Folder name cannot include "/".');
            return;
        }

        try {
            const response = await fetch(`/api/agent-folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to rename folder.');
            }
            const nextFolders = folders.map((item) => (item.id === folderId ? { ...item, name: trimmedName } : item));
            setFolders(nextFolders);
            if (breadcrumbFolders.some((item) => item.id === folderId)) {
                navigateToFolder(currentFolderId ?? null, nextFolders);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to rename folder.');
        }
    };

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

        if (
            !window.confirm(
                `Delete folder "${folder.name}"? It will move ${agentCount} agents and ${subfolderCount} subfolders to the Recycle Bin.`,
            )
        ) {
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

            if (currentFolderId !== null && descendantSet.has(currentFolderId)) {
                navigateToFolder(null);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to delete folder.');
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
        if (!window.confirm(`Delete agent "${agent.agentName}"? It will be moved to Recycle Bin.`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
            if (response.ok) {
                setAgents(agents.filter((a) => a.permanentId !== agent.permanentId && a.agentName !== agent.agentName));
            } else {
                alert('Failed to delete agent');
            }
        } catch (error) {
            alert('Failed to delete agent');
        }
    };

    /**
     * Clones an agent and adds it to the current folder ordering.
     *
     * @param agentIdentifier - Agent identifier to clone.
     */
    const handleClone = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;
        if (!window.confirm(`Clone agent "${agent.agentName}"?`)) return;

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/clone`, {
                method: 'POST',
            });
            if (response.ok) {
                const newAgent = (await response.json()) as AgentOrganizationAgent;
                const identifier = newAgent.permanentId || newAgent.agentName;
                const nextAgent: AgentOrganizationAgent = {
                    ...newAgent,
                    folderId: currentFolderId ?? null,
                    sortOrder: visibleAgents.length,
                };
                setAgents((prev) => [...prev, nextAgent]);
                await persistOrganizationUpdates({
                    agents: [
                        {
                            identifier,
                            folderId: nextAgent.folderId ?? null,
                            sortOrder: nextAgent.sortOrder,
                        },
                    ],
                });
                router.refresh();
            } else {
                alert('Failed to clone agent');
            }
        } catch (error) {
            alert('Failed to clone agent');
        }
    };
    /**
     * Toggles the visibility of an agent.
     *
     * @param agentIdentifier - Agent identifier to toggle.
     */
    const handleToggleVisibility = async (agentIdentifier: string) => {
        const agent = agents.find((a) => a.permanentId === agentIdentifier || a.agentName === agentIdentifier);
        if (!agent) return;

        const newVisibility = agent.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
        if (!window.confirm(`Make agent "${agent.agentName}" ${newVisibility.toLowerCase()}?`)) return;

        const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility: newVisibility }),
        });

        if (response.ok) {
            setAgents(
                agents.map((a) =>
                    a.permanentId === agent.permanentId || a.agentName === agent.agentName
                        ? { ...a, visibility: newVisibility }
                        : a,
                ),
            );
            router.refresh();
        } else {
            alert('Failed to update agent visibility');
        }
    };

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
        const intent = getDropIntentFromRects(activeRect, event.over.rect);
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
                    const isInsideDrop =
                        currentIndicator?.id === event.over.id && currentIndicator.intent === 'inside';
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
            alert(error instanceof Error ? error.message : 'Failed to update organization.');
            router.refresh();
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

    const headingTitle =
        viewMode === 'LIST' && currentFolderId !== null
            ? folderMaps.folderById.get(currentFolderId)?.name || 'Agents'
            : 'Agents';

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
                                    label="All Agents"
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
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                                    previewAgents={getFolderPreviewAgents(folder.id)}
                                    publicUrl={publicUrl}
                                    canOrganize={canOrganize}
                                    activeDragType={activeDragItem?.type ?? null}
                                    dropIndicator={dropIndicator}
                                    onOpen={() => navigateToFolder(folder.id)}
                                    onRename={canOrganize ? () => handleRenameFolder(folder.id) : undefined}
                                    onDelete={canOrganize ? () => handleDeleteFolder(folder.id) : undefined}
                                />
                            ))}
                        </SortableContext>
                        <SortableContext items={visibleAgentDragIds} strategy={rectSortingStrategy}>
                            {visibleAgents.map((agent) => (
                                <SortableAgentCard
                                    key={agent.permanentId || agent.agentName}
                                    agent={agent}
                                    publicUrl={publicUrl}
                                    isAdmin={isAdmin}
                                    canOrganize={canOrganize}
                                    activeDragType={activeDragItem?.type ?? null}
                                    onDelete={handleDelete}
                                    onClone={handleClone}
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            ))}
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
                    />
                </div>
            )}
        </section>
    );
}
