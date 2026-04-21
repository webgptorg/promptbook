'use client';

import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { useCallback, useMemo } from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import {
    buildFolderMaps,
    createFolderDescendantContext,
    createOfficeVisibleFolderIdSet,
    getOfficeAgents,
    getOfficeFolders,
    getVisibleAgents,
    getVisibleFolders,
    getFolderPathSegments,
    parseFolderPath,
    pickPreviewAgents,
    resolveFolderIdFromPath,
    sortBySortOrder,
} from './agentOrganizationUtils';
import type { HomeViewMode } from './homeViewMode';

/**
 * Summary of the parent folder breadcrumb shortcut.
 *
 * @private function of AgentsList
 */
type ParentFolderInfo = {
    readonly id: number | null;
    readonly label: string;
};

/**
 * Props accepted by the derived-state hook for `useAgentsListState`.
 *
 * @private function of AgentsList
 */
type UseAgentsListDerivedStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly folderQuery: string | null;
    readonly folders: AgentOrganizationFolder[];
    readonly formatText: (text: string) => string;
    readonly viewMode: HomeViewMode;
};

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

    if (viewMode === 'OFFICE' || viewMode === 'MAZE' || viewMode === 'PIXEL_OFFICE') {
        return officeAgentCount;
    }

    return totalAgentCount;
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
 * Derives route-scoped folder, breadcrumb, and count state for `useAgentsListState`.
 *
 * @param props - Organization state, folder query, and localization helpers.
 * @returns Derived folder scope, visible items, and presentation labels.
 *
 * @private function of AgentsList
 */
export function useAgentsListDerivedState({
    agents,
    folderQuery,
    folders,
    formatText,
    viewMode,
}: UseAgentsListDerivedStateProps) {
    const folderPathSegments = useMemo(() => parseFolderPath(folderQuery), [folderQuery]);
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
    const headingTitle = resolveHeadingTitle(viewMode, currentFolderId, folderMaps.folderById, localAgentsLabel);

    const getFolderPreviewAgents = useCallback(
        (folderId: number): AgentBasicInformation[] => {
            const descendantContext = createFolderDescendantContext(folderId, folderMaps.childrenByParentId);
            const orderedAgents = sortBySortOrder(agents, (agent) => agent.agentName);
            return pickPreviewAgents(orderedAgents, descendantContext.idSet, 4);
        },
        [agents, folderMaps.childrenByParentId],
    );

    return {
        agentCount,
        allAgentsLabel,
        breadcrumbFolders,
        currentFolderId,
        folderMaps,
        folderPathSegments,
        getFolderPreviewAgents,
        headingTitle,
        localAgentsLabel,
        officeAgents,
        officeFolders,
        parentFolderInfo,
        visibleAgents,
        visibleFolders,
    };
}
