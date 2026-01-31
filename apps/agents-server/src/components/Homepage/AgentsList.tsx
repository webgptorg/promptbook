// Client Component for rendering and deleting agents
'use client';

import { string_url } from '@promptbook-local/types';
import { FolderPlusIcon, Grid, Network, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AddAgentButton } from '../../app/AddAgentButton';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
    AgentOrganizationUpdatePayload,
} from '../../utils/agentOrganization/types';
import { AgentCard } from './AgentCard';
import { AgentsGraph } from './AgentsGraph';
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
    const { agents: initialAgents, folders: initialFolders, isAdmin, canOrganize, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [agents, setAgents] = useState<AgentOrganizationAgent[]>(Array.from(initialAgents));
    const [folders, setFolders] = useState<AgentOrganizationFolder[]>(Array.from(initialFolders));
    const [federatedAgents, setFederatedAgents] = useState<AgentWithVisibility[]>([]);
    const [federatedServersStatus, setFederatedServersStatus] = useState<
        Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>
    >({});
    const dragItemRef = useRef<DragItem | null>(null);

    const viewMode = searchParams.get('view') === 'graph' ? 'GRAPH' : 'LIST';
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

    useEffect(() => {
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
    }, []);
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
     * Stores drag metadata for later drop handling.
     *
     * @param item - Dragged item details.
     */
    const startDrag = (item: DragItem) => {
        dragItemRef.current = item;
    };

    /**
     * Reads drag metadata from state or the event payload.
     *
     * @param event - Drag event to read from.
     * @returns Drag metadata or null.
     */
    const readDragItem = (event: React.DragEvent<HTMLElement>): DragItem | null => {
        if (dragItemRef.current) {
            return dragItemRef.current;
        }
        try {
            const raw = event.dataTransfer.getData('application/json');
            return raw ? (JSON.parse(raw) as DragItem) : null;
        } catch (error) {
            return null;
        }
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
     * Determines how a drop should be handled based on cursor position.
     *
     * @param event - Drag event on the drop target.
     * @returns Drop intent describing placement.
     */
    const getDropIntent = (event: React.DragEvent<HTMLElement>): DropIntent => {
        const rect = event.currentTarget.getBoundingClientRect();
        const offsetY = event.clientY - rect.top;
        const insideTop = rect.height / 4;
        const insideBottom = (rect.height * 3) / 4;
        if (offsetY > insideTop && offsetY < insideBottom) {
            return 'inside';
        }
        return offsetY >= insideBottom ? 'after' : 'before';
    };

    /**
     * Reorders folders within the current parent folder.
     *
     * @param draggedId - Folder id being moved.
     * @param targetId - Target folder id.
     * @param intent - Drop intent for before/after placement.
     */
    const reorderFolders = async (draggedId: number, targetId: number, intent: DropIntent) => {
        const ordered = visibleFolders.map((folder) => folder.id);
        const fromIndex = ordered.indexOf(draggedId);
        const targetIndex = ordered.indexOf(targetId);
        if (fromIndex === -1 || targetIndex === -1) {
            return;
        }

        const insertIndex = intent === 'after' ? targetIndex + 1 : targetIndex;
        const nextOrder = moveItem(ordered, fromIndex, insertIndex);
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
     * @param intent - Drop intent for before/after placement.
     */
    const reorderAgents = async (draggedId: string, targetId: string, intent: DropIntent) => {
        const ordered = visibleAgents.map((agent) => agent.permanentId || agent.agentName);
        const fromIndex = ordered.indexOf(draggedId);
        const targetIndex = ordered.indexOf(targetId);
        if (fromIndex === -1 || targetIndex === -1) {
            return;
        }

        const insertIndex = intent === 'after' ? targetIndex + 1 : targetIndex;
        const nextOrder = moveItem(ordered, fromIndex, insertIndex);
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
     * Handles drop actions on folder cards.
     *
     * @param event - Drag event.
     * @param targetFolder - Folder receiving the drop.
     */
    const handleFolderDrop = async (event: React.DragEvent<HTMLElement>, targetFolder: AgentOrganizationFolder) => {
        event.preventDefault();
        if (!canOrganize) {
            return;
        }
        const dragItem = readDragItem(event);
        if (!dragItem) {
            return;
        }

        try {
            if (dragItem.type === 'AGENT') {
                await moveAgentToFolder(dragItem.identifier, targetFolder.id);
                return;
            }

            const draggedFolderId = Number(dragItem.identifier);
            if (Number.isNaN(draggedFolderId) || draggedFolderId === targetFolder.id) {
                return;
            }

            const intent = getDropIntent(event);
            if (intent === 'inside') {
                await moveFolderToParent(draggedFolderId, targetFolder.id);
                return;
            }

            await reorderFolders(draggedFolderId, targetFolder.id, intent);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update folders.');
            router.refresh();
        }
    };

    /**
     * Handles drop actions on agent cards.
     *
     * @param event - Drag event.
     * @param targetAgentIdentifier - Target agent identifier.
     */
    const handleAgentDrop = async (event: React.DragEvent<HTMLElement>, targetAgentIdentifier: string) => {
        event.preventDefault();
        if (!canOrganize) {
            return;
        }
        const dragItem = readDragItem(event);
        if (!dragItem || dragItem.type !== 'AGENT') {
            return;
        }

        try {
            const intent = getDropIntent(event);
            await reorderAgents(dragItem.identifier, targetAgentIdentifier, intent);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update agents.');
            router.refresh();
        }
    };

    /**
     * Allows dropping items onto breadcrumb segments.
     *
     * @param event - Drag event.
     * @param targetFolderId - Folder id represented by the breadcrumb.
     */
    const handleBreadcrumbDrop = async (event: React.DragEvent<HTMLElement>, targetFolderId: number | null) => {
        event.preventDefault();
        if (!canOrganize) {
            return;
        }
        const dragItem = readDragItem(event);
        if (!dragItem) {
            return;
        }

        try {
            if (dragItem.type === 'AGENT') {
                await moveAgentToFolder(dragItem.identifier, targetFolderId);
                return;
            }

            const draggedFolderId = Number(dragItem.identifier);
            if (Number.isNaN(draggedFolderId)) {
                return;
            }
            await moveFolderToParent(draggedFolderId, targetFolderId);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update folders.');
            router.refresh();
        }
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

    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">
                <div className="flex flex-wrap items-center justify-between w-full gap-4">
                    <div>
                        <span>Agents ({agentCount})</span>
                        {viewMode === 'LIST' && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => navigateToFolder(null)}
                                    onDragOver={(event) => canOrganize && event.preventDefault()}
                                    onDrop={(event) => handleBreadcrumbDrop(event, null)}
                                    className="hover:text-blue-600 transition-colors"
                                >
                                    All Agents
                                </button>
                                {breadcrumbFolders.map((folder) => (
                                    <div key={folder.id} className="flex items-center gap-2">
                                        <span>/</span>
                                        <button
                                            type="button"
                                            onClick={() => navigateToFolder(folder.id)}
                                            onDragOver={(event) => canOrganize && event.preventDefault()}
                                            onDrop={(event) => handleBreadcrumbDrop(event, folder.id)}
                                            className="hover:text-blue-600 transition-colors"
                                        >
                                            {folder.name}
                                        </button>
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
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visibleFolders.map((folder) => (
                        <div
                            key={folder.id}
                            draggable={canOrganize}
                            onDragStart={(event) => {
                                const dragItem: DragItem = {
                                    type: 'FOLDER',
                                    identifier: String(folder.id),
                                    parentId: folder.parentId ?? null,
                                };
                                startDrag(dragItem);
                                event.dataTransfer.setData('application/json', JSON.stringify(dragItem));
                                event.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(event) => canOrganize && event.preventDefault()}
                            onDrop={(event) => handleFolderDrop(event, folder)}
                        >
                            <FolderCard
                                folderName={folder.name}
                                previewAgents={getFolderPreviewAgents(folder.id)}
                                publicUrl={publicUrl}
                                onOpen={() => navigateToFolder(folder.id)}
                                onRename={canOrganize ? () => handleRenameFolder(folder.id) : undefined}
                                onDelete={canOrganize ? () => handleDeleteFolder(folder.id) : undefined}
                            />
                        </div>
                    ))}
                    {visibleAgents.map((agent) => {
                        const agentIdentifier = agent.permanentId || agent.agentName;
                        return (
                            <div
                                key={agentIdentifier}
                                draggable={canOrganize}
                                onDragStart={(event) => {
                                    const dragItem: DragItem = {
                                        type: 'AGENT',
                                        identifier: agentIdentifier,
                                        parentId: agent.folderId ?? null,
                                    };
                                    startDrag(dragItem);
                                    event.dataTransfer.setData('application/json', JSON.stringify(dragItem));
                                    event.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(event) => canOrganize && event.preventDefault()}
                                onDrop={(event) => handleAgentDrop(event, agentIdentifier)}
                            >
                                <AgentCard
                                    agent={agent}
                                    publicUrl={publicUrl}
                                    href={`/agents/${encodeURIComponent(agentIdentifier)}`}
                                    isAdmin={isAdmin}
                                    onDelete={handleDelete}
                                    onClone={handleClone}
                                    onToggleVisibility={handleToggleVisibility}
                                    visibility={agent.visibility}
                                />
                            </div>
                        );
                    })}
                    {isAdmin && <AddAgentButton />}
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
