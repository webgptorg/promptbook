import { string_agent_name, string_url_image } from '../../types/typeAliases';
import { generateGravatarUrl } from './generateGravatarUrl';

/**
 * Generates an image for the agent to use as profile image
 *
 * @param agentName The agent name to generate avatar for
 * @returns The placeholder profile image URL for the agent
 *
 * @public exported from `@promptbook/core`
 */
export function generatePlaceholderAgentProfileImageUrl(agentName?: string_agent_name): string_url_image {
    // Note: [🤹] The fact that profile image is Gravatar is just implementation detail which should be hidden for consumer
    return generateGravatarUrl(agentName);
}

/**
 * TODO: [🤹] Figure out best placeholder image generator https://i.pravatar.cc/1000?u=568
 */
