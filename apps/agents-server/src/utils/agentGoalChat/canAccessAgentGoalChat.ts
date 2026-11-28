import { getCurrentUser } from '../getCurrentUser';

/**
 * Resolves whether the current request may read the goal chat of an agent.
 *
 * Goal chats expose the agent's own planning, so they follow exactly the same rule as the agent
 * source book page (`/agents/<agentName>/book`): a signed-in user is required. Keeping the rule in
 * one place makes the two surfaces impossible to drift apart.
 *
 * @returns `true` when the current identity may read agent goal chats.
 */
export async function canAccessAgentGoalChat(): Promise<boolean> {
    return Boolean(await getCurrentUser());
}
