'use client';

import { AgentBasicInformation, string_agent_name, string_url } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { AgentContextMenuButton, type AgentContextMenuRenamePayload } from '../../../components/AgentContextMenu/AgentContextMenu';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';

/**
 * Props for the `AgentProfileWrapper` component
 */
type AgentProfileWrapperProps = {
    /***
     * Basic information about the agent
     */
    readonly agent: AgentBasicInformation;

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

    /***
     * Indicates if the agent operates in headless mode
     */
    readonly isHeadless: boolean;

    /***
     * Actions to be rendered within the agent profile
     */
    readonly actions: React.ReactNode;

    /***
     * Child components to render within the agent profile
     */
    readonly children: React.ReactNode;
};

export function AgentProfileWrapper(props: AgentProfileWrapperProps) {
    const { agent, agentUrl, publicUrl, agentEmail, agentName, isAdmin, isHeadless, actions, children } = props;
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
            const nextAgentName = payload.agent.agentName;
            const usesPermanentId = Boolean(permanentId && agentName === permanentId);

            if (!nextAgentName) {
                return;
            }

            if (usesPermanentId) {
                router.refresh();
                return;
            }

            if (nextAgentName !== agentName) {
                router.replace(`/agents/${encodeURIComponent(nextAgentName)}`);
                return;
            }

            router.refresh();
        },
        [agentName, permanentId, router],
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
                    agentName={agentName}
                    derivedAgentName={derivedAgentName}
                    permanentId={permanentId}
                    agentUrl={agentUrl}
                    agentEmail={agentEmail}
                    isAdmin={isAdmin}
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
