'use client';

import { DownloadIcon, Eye, EyeOff, FolderPlusIcon } from 'lucide-react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { BreadcrumbDropTarget } from './BreadcrumbDropTarget';

/**
 * Props for the private AgentsList header.
 *
 * @private function of AgentsList
 */
type AgentsListHeaderProps = {
    /**
     * Total count displayed in the heading.
     */
    readonly agentCount: number;
    /**
     * Label for the root breadcrumb.
     */
    readonly allAgentsLabel: string;
    /**
     * Breadcrumb folders for the current list scope.
     */
    readonly breadcrumbFolders: ReadonlyArray<Pick<AgentOrganizationFolder, 'id' | 'name'>>;
    /**
     * Whether folder-management controls are available.
     */
    readonly canOrganize: boolean;
    /**
     * Whether the unfiltered organization snapshot contains at least one hidden folder.
     */
    readonly hasHiddenFolders: boolean;
    /**
     * Current heading title.
     */
    readonly headingTitle: string;
    /**
     * Whether agents import/export controls are available.
     */
    readonly isAdmin: boolean;
    /**
     * Whether hidden folders are currently rendered in the agents list.
     */
    readonly isHiddenFoldersVisible: boolean;
    /**
     * Downloads an agents archive.
     */
    readonly onExportAgents: () => void;
    /**
     * Opens the create-folder dialog.
     */
    readonly onCreateFolder: () => void;
    /**
     * Navigates to the selected folder scope.
     */
    readonly onNavigateToFolder: (folderId: number | null) => void;
    /**
     * Toggles whether hidden folders are visible in the agents list.
     */
    readonly onSetHiddenFoldersVisible: (isVisible: boolean) => void;
    /**
     * Whether agents export is currently running.
     */
    readonly isAgentsExporting: boolean;
    /**
     * Whether agents import is currently running.
     */
    readonly isAgentsImporting: boolean;
};

/**
 * Renders the heading, breadcrumbs, and organization toolbar for `AgentsList`.
 *
 * @param props - Heading data and toolbar callbacks.
 * @returns Header block shown above the agents list.
 *
 * @private function of AgentsList
 */
export function AgentsListHeader({
    agentCount,
    allAgentsLabel,
    breadcrumbFolders,
    canOrganize,
    hasHiddenFolders,
    headingTitle,
    isAdmin,
    isAgentsExporting,
    isAgentsImporting,
    isHiddenFoldersVisible,
    onCreateFolder,
    onExportAgents,
    onNavigateToFolder,
    onSetHiddenFoldersVisible,
}: AgentsListHeaderProps) {
    return (
        <h2 className="text-3xl text-gray-900 mb-6 font-light">
            <div className="flex flex-wrap items-center justify-between w-full gap-4">
                <div>
                    <span>
                        {headingTitle} ({agentCount})
                    </span>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <BreadcrumbDropTarget
                            label={allAgentsLabel}
                            folderId={null}
                            onClick={() => onNavigateToFolder(null)}
                            canOrganize={canOrganize}
                        />
                        {breadcrumbFolders.map((folder) => (
                            <div key={folder.id} className="flex items-center gap-2">
                                <span>/</span>
                                <BreadcrumbDropTarget
                                    label={folder.name}
                                    folderId={folder.id}
                                    onClick={() => onNavigateToFolder(folder.id)}
                                    canOrganize={canOrganize}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <>
                            <button
                                type="button"
                                onClick={onExportAgents}
                                disabled={isAgentsExporting || isAgentsImporting}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                title="Download agents"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                {isAgentsExporting ? 'Downloading...' : 'Download'}
                            </button>
                        </>
                    )}
                    {canOrganize && (
                        <button
                            type="button"
                            onClick={onCreateFolder}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors text-sm"
                            title="Create folder"
                        >
                            <FolderPlusIcon className="w-4 h-4" />
                            New Folder
                        </button>
                    )}
                    {hasHiddenFolders && (
                        <button
                            type="button"
                            onClick={() => onSetHiddenFoldersVisible(!isHiddenFoldersVisible)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                                isHiddenFoldersVisible
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            title={
                                isHiddenFoldersVisible
                                    ? 'Hide folders whose name starts with "."'
                                    : 'Show folders whose name starts with "."'
                            }
                            aria-pressed={isHiddenFoldersVisible}
                        >
                            {isHiddenFoldersVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {isHiddenFoldersVisible ? 'Hide hidden' : 'Show hidden'}
                        </button>
                    )}
                </div>
            </div>
        </h2>
    );
}
