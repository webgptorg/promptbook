import type { AgentBasicInformation, AgentCollection, string_book } from '@promptbook-local/types';
import type { CreateAgentInput } from '../../../../src/collection/agent-collection/CreateAgentInput';
import { scheduleAgentGoalAwakeningSafely } from './agentGoalScheduler';
import { assignAgentOwner } from './agentOwnership';
import { parseAgentSourceVisibility } from './agentVisibility';
import { getDefaultAgentVisibility } from './getDefaultAgentVisibility';

/**
 * Optional placement and visibility overrides for new agent creation.
 */
export type CreateAgentWithDefaultVisibilityOptions = Omit<CreateAgentInput, 'source'> & {
    /**
     * Optional owner that should be assigned after persistence.
     */
    userId?: number;
};

/**
 * Creates an agent while applying metadata-driven default visibility.
 *
 * @param collection - Agent collection used for persistence.
 * @param agentSource - Source content of the agent.
 * @param options - Optional folder/sort/visibility overrides.
 * @returns Created agent profile with permanent id.
 */
export async function createAgentWithDefaultVisibility(
    collection: AgentCollection,
    agentSource: string_book,
    options: CreateAgentWithDefaultVisibilityOptions = {},
): Promise<AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>> {
    const { userId, ...createOptions } = options;
    const sourceVisibility = parseAgentSourceVisibility(agentSource, { isStrict: true });
    const visibility = options.visibility ?? sourceVisibility ?? (await getDefaultAgentVisibility());

    const createdAgent = await collection.createAgent(agentSource, {
        ...createOptions,
        visibility,
    });

    if (typeof userId === 'number') {
        await assignAgentOwner(createdAgent.permanentId, userId);
    }

    await scheduleAgentGoalAwakeningSafely({
        agentPermanentId: createdAgent.permanentId,
        agentSource,
        triggerReason: 'AGENT_CREATED',
        ...(typeof userId === 'number' ? { userId } : {}),
    });

    return createdAgent;
}
