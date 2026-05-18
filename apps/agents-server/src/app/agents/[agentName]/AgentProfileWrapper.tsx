'use client';

import { AgentBasicInformation, string_agent_name, string_url } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { AgentContextMenuButton, type AgentContextMenuRenamePayload } from '../../../components/AgentContextMenu/AgentContextMenu';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import type { AgentFolderContext } from '../../../utils/agentOrganization/agentFolderContext';
import type { AgentVisibility } from '../../../utils/agentVisibility';

/**
 * Extended agent profile information, including visibility status.
 */
export type AgentProfile = AgentBasicInformation & {
    /**
     * Visibility of the agent.
     */
    readonly visibility: AgentVisibility;
};

/**
 * Props for the `AgentProfileWrapper` component
 */
type AgentProfileWrapperProps = {
    /***
     * Basic information about the agent
     */
    readonly agent: AgentProfile;

    /***
     * URL where the agent can be accessed
     */
    readonly agentUrl: string;

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: string_url;

    /***
     * Email address associated with the agent
     */
    readonly agentEmail: string;

    /***
     * Unique name identifier for the agent
     */
    readonly agentName: string_agent_name;

    /***
     * Indicates if the current user has administrative privileges
     */
    readonly isAdmin: boolean;

    /**
     * Indicates whether the current request belongs to a logged-in user.
     */
    readonly isAuthenticated: boolean;

    /***
     * Indicates if the agent operates in headless mode
     */
    readonly isHeadless: boolean;

    /**
     * Folder context for navigating to the agent's folder.
     */
    readonly folderContext?: AgentFolderContext | null;

    /***
     * Actions to be rendered within the agent profile
     */
    readonly actions: React.ReactNode;

    /***
     * Child components to render within the agent profile
     */
    readonly children: React.ReactNode;
};

/**
 * Handles agent profile wrapper.
 */
export function AgentProfileWrapper(props: AgentProfileWrapperProps) {
    const {
        agent,
        agentUrl,
        publicUrl,
        agentEmail,
        agentName,
        isAdmin,
        isAuthenticated,
        isHeadless,
        folderContext,
        actions,
        children,
    } = props;
    const router = useRouter();

    // Derived agentName from agent data
    const derivedAgentName = agent.agentName;
    const permanentId = agent.permanentId;

    /**
     * Navigates to the updated agent route after a rename.
     *
     * @param payload - Rename payload from the context menu.
     */
    const handleAgentRenamed = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            const nextAgentIdentifier = payload.agent.permanentId || payload.agent.agentName;

            if (!nextAgentIdentifier) {
                return;
            }

            if (nextAgentIdentifier !== agentName) {
                router.replace(`/agents/${encodeURIComponent(nextAgentIdentifier)}`);
                return;
            }

            router.refresh();
        },
        [agentName, router],
    );

    return (
        <AgentProfile
            agent={agent}
            agentUrl={agentUrl}
            publicUrl={publicUrl}
            permanentId={permanentId || agentName}
            agentEmail={agentEmail}
            isHeadless={isHeadless}
            renderMenu={({ onShowQrCode }) => (
                <AgentContextMenuButton
                    agent={agent}
                    agentName={agentName}
                    derivedAgentName={derivedAgentName}
                    permanentId={permanentId}
                    agentUrl={agentUrl}
                    agentEmail={agentEmail}
                    folderContext={folderContext}
                    isAdmin={isAdmin}
                    isAuthenticated={isAuthenticated}
                    onShowQrCode={onShowQrCode}
                    onAgentRenamed={handleAgentRenamed}
                />
            )}
            actions={actions}
        >
            {children}
        </AgentProfile>
    );
}
