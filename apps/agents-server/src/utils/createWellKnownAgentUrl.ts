import { CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES } from '../../../../servers';
import type { string_agent_url } from '../../../../src/_packages/types.index';
import { createLocalAgentUrl } from './localAgentRouteReferences';

/**
 * Creates the local profile URL of one bundled well-known agent.
 *
 * @param localServerUrl - Public origin of the owning Agents Server.
 * @param agentName - Logical well-known agent identifier.
 * @returns Canonical URL for the bundled agent.
 */
export function createWellKnownAgentUrl(
    localServerUrl: string,
    agentName: keyof typeof CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES,
): string_agent_url {
    return createLocalAgentUrl(localServerUrl, CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES[agentName]);
}
