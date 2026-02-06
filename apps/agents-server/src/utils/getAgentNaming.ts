import { getMetadata } from '../database/getMetadata';
import { parseAgentNaming, type AgentNaming } from './agentNaming';

/**
 * Loads the agent naming configuration from metadata.
 *
 * @returns Parsed agent naming configuration.
 */
export async function getAgentNaming(): Promise<AgentNaming> {
    const rawNaming = await getMetadata('AGENT_NAMING');
    return parseAgentNaming(rawNaming);
}
