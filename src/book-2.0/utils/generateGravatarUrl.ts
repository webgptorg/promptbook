import { string_agent_name } from '../../types/typeAliases';

/**
 * Generates a gravatar URL based on agent name for fallback avatar
 *
 * @param agentName The agent name to generate avatar for
 * @returns Gravatar URL
 *
 * @private Usage of 
 */
export function generateGravatarUrl(agentName?: string_agent_name): string {
    // Use a default name if none provided
    const safeName = agentName || 'Anonymous Agent';

    // Create a simple hash from the name for consistent avatar
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
        const char = safeName.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const avatarId = Math.abs(hash).toString();
    return `https://www.gravatar.com/avatar/${avatarId}?default=robohash&size=200&rating=x`;
}


/**
 * Generates a gravatar URL based on agent name for fallback avatar
 *
 * @param agentName The agent name to generate avatar for
 * @returns Gravatar URL
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function generateAgentProfileImageUrl(agentName?: string_agent_name): string {

   return generateGravatarUrl(agentName);
}
