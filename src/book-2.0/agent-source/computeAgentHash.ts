import type { string_agent_hash } from '../../types/string_agent_name';
import { computeHash } from '../../utils/misc/computeHash';
import type { string_book } from './string_book';

/**
 * Computes SHA-256 hash of the agent source
 *
 * @public exported from `@promptbook/core`
 */
export function computeAgentHash(agentSource: string_book): string_agent_hash {
    return computeHash(agentSource);
}
