import type { string_agent_name, string_url_image } from '../../types/typeAliases';
import { normalizeAgentName } from '../agent-source/normalizeAgentName';

/**
 * Generates an image for the agent to use as profile image
 *
 * @param agentName The agent name to generate avatar for
 * @returns The placeholder profile image URL for the agent
 *
 * @public exported from `@promptbook/core`
 */
export function generatePlaceholderAgentProfileImageUrl(agentName?: string_agent_name): string_url_image {
    if (!agentName) {
        // TODO: [🧠] What to return if agentName is not provided?
        return '/agents/-/images/default-avatar.png';
    }

    return `/agents/${normalizeAgentName(agentName)}/images/default-avatar.png`;
}

/**
 * TODO: [🤹] Figure out best placeholder image generator https://i.pravatar.cc/1000?u=568
 */
