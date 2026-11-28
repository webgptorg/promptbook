'use client';

import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { QrCodeModal } from '../AgentProfile/QrCodeModal';
import { useAgentBackground } from '../AgentProfile/useAgentBackground';

/**
 * Props for the agent QR code modal wrapper.
 *
 * @private function of AgentsList
 */
export type AgentQrCodeModalProps = {
    /**
     * Agent to render the QR code for.
     */
    readonly agent: AgentOrganizationAgent;
    /**
     * Public URL to the agent page.
     */
    readonly agentUrl: string;
    /**
     * Agent email address.
     */
    readonly agentEmail: string;
    /**
     * Close handler for the modal.
     */
    readonly onClose: () => void;
};

/**
 * Renders the agent QR code modal with the correct brand color.
 *
 * @private function of AgentsList
 */
export function AgentQrCodeModal({ agent, agentUrl, agentEmail, onClose }: AgentQrCodeModalProps) {
    const { brandColorHex } = useAgentBackground(agent.meta.color);
    const personaDescription = agent.meta.description || agent.personaDescription || '';

    return (
        <QrCodeModal
            onClose={onClose}
            agentName={agent.agentName}
            meta={agent.meta}
            personaDescription={personaDescription}
            agentUrl={agentUrl}
            agentEmail={agentEmail}
            brandColorHex={brandColorHex}
        />
    );
}
