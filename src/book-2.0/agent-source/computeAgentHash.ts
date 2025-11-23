import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { string_agent_hash } from '../../types/typeAliases';
import { string_book } from './string_book';

/**
 * Computes SHA-256 hash of the agent source
 *
 * @public exported from `@promptbook/core`
 */

export function computeAgentHash(agentSource: string_book): string_agent_hash {
    return sha256(hexEncoder.parse(agentSource /* <- TODO: !!!!! spaceTrim */)).toString(/* hex */);
}
