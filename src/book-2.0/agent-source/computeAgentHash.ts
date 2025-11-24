import { string_agent_hash } from '../../types/typeAliases';
import { computeHash } from '../../utils/misc/computeHash';
import { string_book } from './string_book';

/**
 * Computes SHA-256 hash of the agent source
 *
 * @public exported from `@promptbook/core`
 */
export function computeAgentHash(agentSource: string_book): string_agent_hash {
    return computeHash(agentSource);
}
