'use client';

import { AgentBasicInformation, string_agent_name } from '@promptbook-local/types';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { AgentOptionsMenu } from './AgentOptionsMenu';

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
    readonly publicUrl: URL;

    /***
     * Email address associated with the agent
     */
    readonly agentEmail: string;

    /***
     * Unique name identifier for the agent
     */
    readonly agentName: string_agent_name;

    /***
     * Brand color for the agent in hexadecimal format
     */
    readonly brandColorHex: string;

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
    const { agent, agentUrl, publicUrl, agentEmail, agentName, brandColorHex, isAdmin, isHeadless, actions, children } =
        props;

    // Derived agentName from agent data
    const derivedAgentName = agent.agentName;
    const permanentId = agent.permanentId;

    return (
        <AgentProfile
            agent={agent}
            agentUrl={agentUrl}
            publicUrl={publicUrl}
            permanentId={permanentId || agentName}
            agentEmail={agentEmail}
            isHeadless={isHeadless}
            renderMenu={({ onShowQrCode }) => (
                <AgentOptionsMenu
                    agentName={agentName}
                    derivedAgentName={derivedAgentName}
                    permanentId={permanentId}
                    agentUrl={agentUrl}
                    agentEmail={agentEmail}
                    brandColorHex={brandColorHex}
                    isAdmin={isAdmin}
                    onShowQrCode={onShowQrCode}
                    backgroundImage="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYJh39z8ABJgCe/ZvAS4AAAAASUVORK5CYII="
                />
            )}
            actions={actions}
        >
            {children}
        </AgentProfile>
    );
}
