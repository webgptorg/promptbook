import type { AgentBasicInformation } from '../AgentBasicInformation';

/**
 * Ensures the parsed profile always exposes a fullname value.
 *
 * @private internal utility of `parseAgentSource`
 */
export function ensureMetaFullname(meta: AgentBasicInformation['meta'], fallbackFullname: string): void {
    if (!meta.fullname) {
        meta.fullname = fallbackFullname;
    }
}
