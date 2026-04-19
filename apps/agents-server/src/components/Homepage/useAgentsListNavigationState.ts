'use client';

import type { string_url } from '@promptbook-local/types';
import { useCallback, useMemo } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { buildFolderMaps, buildFolderPath, getFolderPathSegments } from './agentOrganizationUtils';
import type { HomeViewMode } from './homeViewMode';
import { useFederatedAgents, type AgentWithVisibility } from './useFederatedAgents';

/**
 * Minimal router interface required by the private navigation hook.
 *
 * @private function of AgentsList
 */
type AgentsListNavigationRouter = {
    readonly push: (href: string, options?: { scroll?: boolean }) => void;
};

/**
 * Props accepted by the private navigation and agent-address helper hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListNavigationStateProps = {
    readonly folders: AgentOrganizationFolder[];
    readonly initialExternalAgents?: AgentWithVisibility[];
    readonly publicUrl: string_url;
    readonly router: AgentsListNavigationRouter;
    readonly searchParamsSnapshot: string;
    readonly showFederatedAgents: boolean;
    readonly viewMode: HomeViewMode;
};

/**
 * Navigation, federated-agent, and agent-address helpers returned to `useAgentsListState`.
 *
 * @private function of AgentsList
 */
type UseAgentsListNavigationStateResult = {
    readonly buildAgentEmail: (identifier: string) => string;
    readonly buildAgentUrl: (identifier: string) => string;
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: ReturnType<typeof useFederatedAgents>['federatedServersStatus'];
    readonly navigateToFolder: (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => void;
};

/**
 * Keeps homepage navigation and agent-address helpers focused outside the main `useAgentsListState` composition.
 *
 * @param props - Folder snapshot, route helpers, and federated-agent inputs.
 * @returns Folder navigation, federated-agent state, and agent URL/email builders.
 *
 * @private function of AgentsList
 */
export function useAgentsListNavigationState({
    folders,
    initialExternalAgents,
    publicUrl,
    router,
    searchParamsSnapshot,
    showFederatedAgents,
    viewMode,
}: UseAgentsListNavigationStateProps): UseAgentsListNavigationStateResult {
    const normalizedPublicUrl = useMemo(
        () => (publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`),
        [publicUrl],
    );
    const publicUrlHost = useMemo(() => {
        try {
            return new URL(normalizedPublicUrl).hostname;
        } catch {
            return '';
        }
    }, [normalizedPublicUrl]);
    const shouldRefreshFederatedAgents = showFederatedAgents && viewMode !== 'LIST';
    const { federatedAgents, federatedServersStatus } = useFederatedAgents(
        showFederatedAgents,
        initialExternalAgents,
        shouldRefreshFederatedAgents,
    );

    const navigateToFolder = useCallback(
        (folderId: number | null, overrideFolders?: AgentOrganizationFolder[]) => {
            const targetFolders = overrideFolders || folders;
            const { folderById } = buildFolderMaps(targetFolders);
            const targetSegments = getFolderPathSegments(folderId, folderById).map((folder) => folder.name);
            const nextSearchParams = new URLSearchParams(searchParamsSnapshot);

            if (targetSegments.length === 0) {
                nextSearchParams.delete('folder');
            } else {
                nextSearchParams.set('folder', buildFolderPath(targetSegments));
            }

            router.push(`?${nextSearchParams.toString()}`, { scroll: false });
        },
        [folders, router, searchParamsSnapshot],
    );

    const buildAgentUrl = useCallback(
        (identifier: string) => `${normalizedPublicUrl}${encodeURIComponent(identifier)}`,
        [normalizedPublicUrl],
    );
    const buildAgentEmail = useCallback(
        (identifier: string) => (publicUrlHost ? `${identifier}@${publicUrlHost}` : ''),
        [publicUrlHost],
    );

    return {
        buildAgentEmail,
        buildAgentUrl,
        federatedAgents,
        federatedServersStatus,
        navigateToFolder,
    };
}
