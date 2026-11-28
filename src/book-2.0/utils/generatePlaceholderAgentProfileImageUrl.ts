import type { string_agent_name, string_agent_permanent_id } from '../../types/string_agent_name';
import type { string_url } from '../../types/string_url';
import type { string_url_image } from '../../types/string_url_image';

/**
 * Generates an image for the agent to use as profile image
 *
 * @param agentId - The permanent ID of the agent
 * @returns The placeholder profile image URL for the agent
 *
 * @public exported from `@promptbook/core`
 */
export function generatePlaceholderAgentProfileImageUrl(
    agentIdOrName: string_agent_permanent_id | string_agent_name,
    agentsServerUrl: URL | string_url,
): string_url_image {
    if (typeof agentsServerUrl === 'string') {
        agentsServerUrl = new URL(agentsServerUrl);
    }

    return `${agentsServerUrl.href}agents/${agentIdOrName}/images/default-avatar.png`;
}

// TODO: [🤹] Figure out best placeholder image generator https://i.pravatar.cc/1000?u=568
