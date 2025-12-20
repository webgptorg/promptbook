'use client';

import { AgentBasicInformation, string_agent_name } from '@promptbook-local/types';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { AgentOptionsMenu } from './AgentOptionsMenu';

type AgentProfileWrapperProps = {
    /***
     * @@@
     */
    readonly agent: AgentBasicInformation;

    /***
     * @@@
     */
    readonly agentUrl: string;

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: URL;

    /***
     * @@@
     */
    readonly agentEmail: string;

    /***
     * @@@
     */
    readonly agentName: string_agent_name;

    /***
     * @@@
     */
    readonly brandColorHex: string;

    /***
     * @@@
     */
    readonly isAdmin: boolean;

    /***
     * @@@
     */
    readonly isHeadless: boolean;

    readonly actions: React.ReactNode;

    /***
     * @@@
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
