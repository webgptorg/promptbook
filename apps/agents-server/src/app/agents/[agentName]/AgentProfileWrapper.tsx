'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { string_data_url, string_url_image } from '../../../../../../src/types/typeAliases';
import { AgentProfile } from '../../../components/AgentProfile/AgentProfile';
import { AgentOptionsMenu } from './AgentOptionsMenu';

type AgentProfileWrapperProps = {
    agent: AgentBasicInformation;
    agentUrl: string;
    agentEmail: string;
    agentName: string;
    brandColorHex: string;
    isAdmin: boolean;
    actions: React.ReactNode;
    children: React.ReactNode;
};

export function AgentProfileWrapper(props: AgentProfileWrapperProps) {
    const { agent, agentUrl, agentEmail, agentName, brandColorHex, isAdmin, actions, children } = props;

    return (
        <AgentProfile
            agent={agent}
            agentUrl={agentUrl}
            agentEmail={agentEmail}
            renderMenu={({ onShowQrCode }) => (
                <AgentOptionsMenu
                    agentName={agentName}
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
