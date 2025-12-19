import type { string_agent_name, string_agent_permanent_id, string_url_image } from '../../types/typeAliases';

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
): string_url_image {
    return `/agents/${agentIdOrName}/images/default-avatar.png`;
}

/**
 * TODO: [🤹] Figure out best placeholder image generator https://i.pravatar.cc/1000?u=568
 */
