import { CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES } from '../../../../servers';
import { string_agent_url } from '../../../../src/_packages/types.index'; // <- [🚾]
import { getMetadata } from '../database/getMetadata';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 */
export async function getWellKnownAgentUrl(
    agentName: keyof typeof CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES,
): Promise<string_agent_url> {
    const coreServer = (await getMetadata('CORE_SERVER'))!;

    return `${coreServer}agents/${CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES[agentName]}` as string_agent_url;
}
