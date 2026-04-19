'use client';

import type { string_url } from '@promptbook-local/types';
import { useSearchParams } from 'next/navigation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { AgentsList } from './AgentsList';
import { ExternalAgentsSectionClient } from './ExternalAgentsSectionClient';
import { HomepageMessage } from './HomepageMessage';
import { isHomeListViewMode, resolveHomeViewMode } from './homeViewMode';

/**
 * Props for the shared homepage/dashboard agents content block.
 */
type AgentsHomePageContentProps = {
    /**
     * Current local agents snapshot.
     */
    readonly agents: AgentOrganizationAgent[];

    /**
     * Current local folders snapshot.
     */
    readonly folders: AgentOrganizationFolder[];

    /**
     * Whether the current user can access admin-only agent actions.
     */
    readonly isAdmin: boolean;

    /**
     * Whether the current user can organize agents and folders.
     */
    readonly canOrganize: boolean;

    /**
     * Current server public URL forwarded to client-only children.
     */
    readonly publicUrl: string_url;

    /**
     * Optional markdown message shown above the root homepage.
     */
    readonly homepageMessage: string | null;
};

/**
 * Returns true when the homepage is scoped to a non-root folder.
 *
 * @param folderQuery - Current `folder` query value.
 * @returns Whether the homepage should render the subfolder view.
 */
function isSubfolderViewActive(folderQuery: string | null): boolean {
    return typeof folderQuery === 'string' && folderQuery.trim().length > 0;
}

/**
 * Shared homepage/dashboard content that derives query-only UI state on the client.
 *
 * This keeps folder and view-mode changes instant even when the server is slow,
 * because the visible homepage state no longer depends on server-side `searchParams`.
 *
 * @param props - Static server data forwarded into the client wrapper.
 * @returns Shared agents homepage content block.
 */
export function AgentsHomePageContent({
    agents,
    folders,
    isAdmin,
    canOrganize,
    publicUrl,
    homepageMessage,
}: AgentsHomePageContentProps) {
    const searchParams = useSearchParams();
    const folderQuery = searchParams?.get('folder') || null;
    const viewMode = resolveHomeViewMode(searchParams?.get('view'));
    const isSubfolderView = isSubfolderViewActive(folderQuery);
    const isListView = isHomeListViewMode(viewMode);

    return (
        <>
            {!isSubfolderView && <HomepageMessage message={homepageMessage} />}
            <AgentsList
                agents={agents}
                folders={folders}
                isAdmin={isAdmin}
                canOrganize={canOrganize}
                publicUrl={publicUrl}
                showFederatedAgents={!isSubfolderView}
                isSubfolderView={isSubfolderView}
            />
            {isListView && !isSubfolderView && <ExternalAgentsSectionClient publicUrl={publicUrl} />}
        </>
    );
}
