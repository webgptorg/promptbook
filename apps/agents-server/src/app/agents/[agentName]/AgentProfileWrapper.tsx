'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { AgentOptionsMenu } from './AgentOptionsMenu';

type AgentProfileWrapperProps = {
    agent: AgentBasicInformation;
    agentUrl: string;
    agentEmail: string;
    agentName: string;
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

    return (
        <AgentProfile
            agent={agent}
            agentUrl={agentUrl}
            agentEmail={agentEmail}
            isHeadless={isHeadless}
            renderMenu={({ onShowQrCode }) => (
                <AgentOptionsMenu
                    agentName={agentName}
                    derivedAgentName={derivedAgentName}
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
