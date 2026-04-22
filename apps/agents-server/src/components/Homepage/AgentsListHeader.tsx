'use client';

import { Building2, FolderPlusIcon, Gamepad2, Grid, Network, Route, type LucideIcon } from 'lucide-react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { HomeViewMode } from './homeViewMode';
import { BreadcrumbDropTarget } from './BreadcrumbDropTarget';

/**
 * Static metadata for one view-mode toggle button.
 *
 * @private function of AgentsList
 */
type ViewModeButton = {
    /**
     * View mode activated by the button.
     */
    readonly mode: HomeViewMode;
    /**
     * Short visible label shown next to the icon.
     */
    readonly label: string;
    /**
     * Tooltip title for the toggle button.
     */
    readonly title: string;
    /**
     * Icon rendered next to the label.
     */
    readonly icon: LucideIcon;
};

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
     * Current heading title.
     */
    readonly headingTitle: string;
    /**
     * Opens the create-folder dialog.
     */
    readonly onCreateFolder: () => void;
    /**
     * Navigates to the selected folder scope.
     */
    readonly onNavigateToFolder: (folderId: number | null) => void;
    /**
     * Switches the homepage view mode.
     */
    readonly onSetViewMode: (mode: HomeViewMode) => void;
    /**
     * Currently active homepage view mode.
     */
    readonly viewMode: HomeViewMode;
};

/**
 * View-mode button definitions rendered in the header toggle group.
 *
 * @private function of AgentsList
 */
const VIEW_MODE_BUTTONS: ReadonlyArray<ViewModeButton> = [
    { mode: 'LIST', label: 'List', title: 'List View', icon: Grid },
    { mode: 'GRAPH', label: 'Graph', title: 'Graph View', icon: Network },
    { mode: 'OFFICE', label: 'Office', title: 'Office View', icon: Building2 },
    { mode: 'MAZE', label: 'Maze', title: 'Maze View', icon: Route },
    { mode: 'PIXEL_OFFICE', label: 'Pixel', title: 'Pixel Office View', icon: Gamepad2 },
];

/**
 * Renders the heading, breadcrumbs, and view toggle toolbar for `AgentsList`.
 *
 * @param props - Heading data and toolbar callbacks.
 * @returns Header block shown above the active homepage view.
 *
 * @private function of AgentsList
 */
export function AgentsListHeader({
    agentCount,
    allAgentsLabel,
    breadcrumbFolders,
    canOrganize,
    headingTitle,
    onCreateFolder,
    onNavigateToFolder,
    onSetViewMode,
    viewMode,
}: AgentsListHeaderProps) {
    const isListView = viewMode === 'LIST';
    const showBreadcrumbs = viewMode !== 'GRAPH';

    return (
        <h2 className="mb-6 text-3xl font-light text-slate-900 dark:text-slate-50">
            <div className="flex flex-wrap items-center justify-between w-full gap-4">
                <div>
                    <span>
                        {headingTitle} ({agentCount})
                    </span>
                    {showBreadcrumbs && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
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
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isListView && canOrganize && (
                        <button
                            type="button"
                            onClick={onCreateFolder}
                            className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30"
                            title="Create folder"
                        >
                            <FolderPlusIcon className="w-4 h-4" />
                            New Folder
                        </button>
                    )}
                    <div className="ml-4 flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900/70 dark:ring-1 dark:ring-white/10">
                        {VIEW_MODE_BUTTONS.map(({ mode, label, title, icon: Icon }) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onSetViewMode(mode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                    viewMode === mode
                                        ? 'bg-white font-medium text-sky-600 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                                }`}
                                title={title}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </h2>
    );
}
