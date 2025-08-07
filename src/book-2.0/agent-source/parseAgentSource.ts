import type { string_agent_name, string_url_image } from '../../types/typeAliases';
import { parseAgentSourceBasicInfo } from '../commitments/_misc/parseAgentSourceWithCommitments';
import type { string_agent_source } from './string_agent_source';

export interface AgentSourceBasicInformation {
    /**
     * Name of the agent
     * This is the first line of the agent source
     */
    agentName: string_agent_name | null;

    /**
     * Optional description of the agent
     * This is the line starting with "PERSONA"
     */
    personaDescription: string | null;

    /**
     * Optional profile image URL
     * This is the line starting with "META IMAGE"
     */
    profileImageUrl: string_url_image;
}

/**
 * Parses agent source string into its components
 */
// Cache for parsed agent sources to prevent repeated parsing
const parsedAgentSourceCache = new Map<string, AgentSourceBasicInformation>();

/**
 * Parses basic information from agent source
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentSource(agentSource: string_agent_source): AgentSourceBasicInformation {
    // Check if we already parsed this agent source
    if (parsedAgentSourceCache.has(agentSource)) {
        return parsedAgentSourceCache.get(agentSource)!;
    }

    // Use the new commitment-based parsing system
    const result = parseAgentSourceBasicInfo(agentSource);

    // Cache the result
    parsedAgentSourceCache.set(agentSource, result);

    return result;
}
