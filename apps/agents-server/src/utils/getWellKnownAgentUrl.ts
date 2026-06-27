import { CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES } from '../../../../servers';
import { string_agent_url } from '../../../../src/_packages/types.index'; // <- [🚾]
import { resolveCurrentOrInternalServerOrigin } from './resolveCurrentOrInternalServerOrigin';

/**
 * Resolves the URL of one well-known agent (Adam, Teacher, ...) hosted locally in the `.core` folder of the current Agents Server.
 *
 * @param agentName - Logical well-known agent identifier.
 * @returns Absolute URL of the well-known agent on the current server.
 *
 * @private utility of Agents Server
 */
export async function getWellKnownAgentUrl(
    agentName: keyof typeof CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES,
): Promise<string_agent_url> {
    const localServerOrigin = await resolveCurrentOrInternalServerOrigin();
    const normalizedServerOrigin = localServerOrigin.replace(/\/+$/g, '');

    return `${normalizedServerOrigin}/agents/${CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES[agentName]}` as string_agent_url;
}
