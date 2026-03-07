import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { Json } from '../../database/schema';

/**
 * Parses one serialized agent profile.
 *
 * @param rawProfile Serialized profile JSON value.
 * @returns Parsed profile when shape is object-like.
 * @private function of createDefaultServerSearchProviders
 */
export function toAgentProfile(rawProfile: Json): Partial<AgentBasicInformation> {
    if (rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)) {
        return rawProfile as Partial<AgentBasicInformation>;
    }

    return {};
}
