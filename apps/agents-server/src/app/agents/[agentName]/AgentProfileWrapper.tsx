'use client';

import { AgentBasicInformation, string_agent_name } from '@promptbook-local/types';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { AgentOptionsMenu } from './AgentOptionsMenu';

type AgentProfileWrapperProps = {
    agent: AgentBasicInformation;
    agentUrl: string;
    agentEmail: string;
    agentName: string_agent_name;
    brandColorHex: string;
    isAdmin: boolean;
    isHeadless: boolean;
    actions: React.ReactNode;
    children: React.ReactNode;
};

export function AgentProfileWrapper(props: AgentProfileWrapperProps) {
    const { agent, agentUrl, agentEmail, agentName, brandColorHex, isAdmin, isHeadless, actions, children } = props;

    // Derived agentName from agent data
    const derivedAgentName = agent.agentName;
    const permanentId = agent.permanentId;

    return (
        <AgentProfile
            agent={agent}
            agentUrl={agentUrl}
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
