import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';

/**
 * Resolves the display label for an agent in the menu.
 *
 * @param agent - Agent shown in the header menu.
 * @returns Human-friendly agent label.
 * @private function of Header
 */
export function getAgentMenuLabel(agent: AgentOrganizationAgent): string {
    return agent.meta?.fullname || agent.agentName;
}
