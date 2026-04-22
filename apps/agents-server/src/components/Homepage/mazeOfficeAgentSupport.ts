import type { AvatarVisualId } from '../../../../../src/avatars/types/AvatarVisualDefinition';
import { resolveAgentAvatar } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Shared agent shape accepted by maze-view avatar filtering.
 *
 * @private helper of the homepage maze office
 */
export type MazeRenderableAgent = (AgentOrganizationAgent | AgentWithVisibility) & {
    /**
     * Optional explicit marker forwarded by remote profile payloads.
     */
    readonly isMetaImageExplicit?: boolean;
    /**
     * Optional built-in avatar visual preferred by the agent/profile payload.
     */
    readonly avatarVisualId?: AvatarVisualId;
};

/**
 * Returns true when an agent should appear in the maze visualization.
 *
 * Agents using explicit `META IMAGE` are omitted so the environment keeps one coherent
 * in-world avatar language, while built-in avatar visuals remain eligible.
 *
 * @param agent - Agent to inspect.
 * @param publicUrl - Local public server URL used as a fallback resolution base.
 * @returns True when the maze should render the agent.
 *
 * @private helper of the homepage maze office
 */
export function isMazeRenderableAgent(agent: MazeRenderableAgent, publicUrl: string): boolean {
    const resolvedAgentAvatar = resolveAgentAvatar({
        agent,
        baseUrl: 'serverUrl' in agent && agent.serverUrl ? agent.serverUrl : publicUrl,
    });

    return resolvedAgentAvatar?.type === 'visual';
}

/**
 * Filters a list of agents down to the ones supported by the maze visualization.
 *
 * @param agents - Candidate agents.
 * @param publicUrl - Local public server URL used as a fallback resolution base.
 * @returns Agents that should appear in the maze.
 *
 * @private helper of the homepage maze office
 */
export function filterMazeRenderableAgents<T extends MazeRenderableAgent>(
    agents: ReadonlyArray<T>,
    publicUrl: string,
): Array<T> {
    return agents.filter((agent) => isMazeRenderableAgent(agent, publicUrl));
}
