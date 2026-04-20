'use client';

import type { string_url } from '@promptbook-local/types';
import { useSearchParams } from 'next/navigation';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { getIsSubfolderView } from '../../utils/getIsSubfolderView';
import { AgentsList } from './AgentsList';
import { ExternalAgentsSectionClient } from './ExternalAgentsSectionClient';
import { HomepageMessage } from './HomepageMessage';
import { isHomeListViewMode, resolveHomeViewMode } from './homeViewMode';

/**
 * Props for the shared homepage/dashboard agents section.
 */
type HomepagePrimarySectionsProps = {
    /**
     * Local agents rendered in the main agents list.
     */
    readonly agents: ReadonlyArray<AgentOrganizationAgent>;
    /**
     * Folder hierarchy rendered in the main agents list.
     */
    readonly folders: ReadonlyArray<AgentOrganizationFolder>;
    /**
     * Whether the current user has administrative privileges.
     */
    readonly isAdmin: boolean;
    /**
     * Whether the current user can organize agents and folders.
     */
    readonly canOrganize: boolean;
    /**
     * Public server URL forwarded to child client surfaces.
     */
    readonly publicUrl: string_url;
    /**
     * Optional markdown message shown above the root agents view.
     */
    readonly homepageMessage: string | null;
};

/**
 * Renders the homepage/dashboard sections that depend on folder/view query params.
 */
export function HomepagePrimarySections({
    agents,
    folders,
    isAdmin,
    canOrganize,
    publicUrl,
    homepageMessage,
}: HomepagePrimarySectionsProps) {
    const searchParams = useSearchParams();
    const isSubfolderView = getIsSubfolderView(searchParams || undefined);
    const viewMode = resolveHomeViewMode(searchParams?.get('view'));
    const isListView = isHomeListViewMode(viewMode);

    return (
        <>
            {!isSubfolderView && <HomepageMessage message={homepageMessage} />}
            <AgentsList
                agents={[...agents]}
                folders={[...folders]}
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
