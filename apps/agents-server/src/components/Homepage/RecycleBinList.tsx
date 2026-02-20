// Client Component for rendering deleted agents and folders
'use client';

import type { string_url } from '@promptbook-local/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { AgentCard } from './AgentCard';
import { FolderCard } from './FolderCard';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
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
 * Props for the recycle bin list component.
 */
type RecycleBinListProps = {
    /**
     * Deleted agents to render.
     */
    readonly agents: ReadonlyArray<AgentOrganizationAgent>;
    /**
     * Deleted folders to render.
     */
    readonly folders: ReadonlyArray<AgentOrganizationFolder>;
    /**
     * Indicates whether the current user can restore items.
     */
    readonly canRestore: boolean;
    /**
     * Base URL of the agents server.
     */
    readonly publicUrl: string_url;
};

/**
 * Renders the recycle bin contents with folder navigation and restore actions.
 */
export function RecycleBinList(props: RecycleBinListProps) {
    const { agents, folders, canRestore, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { formatText } = useAgentNaming();
    const folderPathSegments = parseFolderPath(searchParams.get('folder'));
    const currentFolderId = useMemo(
        () => resolveFolderIdFromPath([...folders], folderPathSegments),
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

    /**
     * Updates the folder query param for navigation.
     *
     * @param folderId - Folder to navigate into.
     */
    const navigateToFolder = (folderId: number | null) => {
        const { folderById } = buildFolderMaps(folders);
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
     * Restores a deleted agent.
     *
     * @param agentIdentifier - Agent identifier to restore.
     */
    const handleRestoreAgent = async (agentIdentifier: string) => {
        if (!canRestore) {
            return;
        }

        try {
            const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/restore`, {
                method: 'POST',
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || formatText('Failed to restore agent.'));
            }
            router.refresh();
        } catch (error) {
            await showAlert({
                title: 'Restore failed',
                message: error instanceof Error ? error.message : formatText('Failed to restore agent.'),
            }).catch(() => undefined);
        }
    };

    /**
     * Restores a deleted folder and its contents.
     *
     * @param folderId - Folder id to restore.
     */
    const handleRestoreFolder = async (folderId: number) => {
        if (!canRestore) {
            return;
        }

        try {
            const response = await fetch(`/api/agent-folders/${folderId}/restore`, { method: 'POST' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to restore folder.');
            }
            router.refresh();
        } catch (error) {
            await showAlert({
                title: 'Restore failed',
                message: error instanceof Error ? error.message : 'Failed to restore folder.',
            }).catch(() => undefined);
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
        const orderedAgents = sortBySortOrder([...agents], (agent) => agent.agentName);
        return pickPreviewAgents(orderedAgents, previewSet, 4);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <button
                    type="button"
                    onClick={() => navigateToFolder(null)}
                    className="hover:text-blue-600 transition-colors"
                >
                    Recycle Bin
                </button>
                {breadcrumbFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-2">
                        <span>/</span>
                        <button
                            type="button"
                            onClick={() => navigateToFolder(folder.id)}
                            className="hover:text-blue-600 transition-colors"
                        >
                            {folder.name}
                        </button>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleFolders.map((folder) => (
                    <FolderCard
                        key={folder.id}
                        folderName={folder.name}
                        folderIcon={folder.icon}
                        folderColor={folder.color}
                        previewAgents={getFolderPreviewAgents(folder.id)}
                        publicUrl={publicUrl}
                        onOpen={() => navigateToFolder(folder.id)}
                        onRestore={canRestore ? () => handleRestoreFolder(folder.id) : undefined}
                    />
                ))}
                {visibleAgents.map((agent) => (
                    <AgentCard
                        key={agent.permanentId || agent.agentName}
                        agent={agent}
                        publicUrl={publicUrl}
                        href={`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`}
                        isAdmin={canRestore}
                        onRestore={handleRestoreAgent}
                    />
                ))}
            </div>
        </div>
    );
}
