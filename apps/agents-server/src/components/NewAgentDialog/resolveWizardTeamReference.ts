import { normalizeServerUrl } from '../Homepage/normalizeServerUrl';
import { normalizeTeamReferenceInput } from './NewAgentWizardState';

/**
 * Minimal agent shape needed to resolve a wizard TEAM reference.
 */
type ResolveWizardTeamReferenceAgent = {
    /**
     * Local agent name used for compact references.
     */
    readonly agentName: string;

    /**
     * Canonical server URL where the agent is hosted.
     */
    readonly serverUrl?: string;

    /**
     * Canonical absolute profile URL of the agent.
     */
    readonly url: string;
};

/**
 * Resolves the TEAM commitment value emitted when the user selects one agent card in the wizard.
 *
 * Local agents keep compact `{Agent}` references so the resulting source stays human-readable,
 * while federated agents keep their absolute URLs for unambiguous cross-server routing.
 *
 * @param agent - Selected agent card.
 * @param currentServerUrl - Canonical URL of the current Agents Server instance.
 * @returns TEAM reference to store in wizard state.
 */
export function resolveWizardTeamReference(agent: ResolveWizardTeamReferenceAgent, currentServerUrl: string): string {
    const normalizedCurrentServerUrl = normalizeServerUrl(currentServerUrl);
    const normalizedAgentServerUrl = normalizeServerUrl(agent.serverUrl || currentServerUrl);

    if (normalizedAgentServerUrl === normalizedCurrentServerUrl) {
        return normalizeTeamReferenceInput(agent.agentName);
    }

    return agent.url;
}
