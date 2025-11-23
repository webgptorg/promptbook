import { string_agent_name } from '../../types/typeAliases';
import { computeAgentHash } from './computeAgentHash';
import { normalizeAgentName } from './normalizeAgentName';
import { string_book } from './string_book';

/**
 * Creates temporary default agent name based on agent source hash
 *
 * @public exported from `@promptbook/core`
 */
export function createDefaultAgentName(agentSource: string_book): string_agent_name {
    const agentHash = computeAgentHash(agentSource);
    return normalizeAgentName(`Agent ${agentHash.substring(0, 6)}`);
}
