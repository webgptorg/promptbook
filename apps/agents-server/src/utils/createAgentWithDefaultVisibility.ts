import type { AgentBasicInformation, AgentCollection, string_book } from '@promptbook-local/types';
import type { CreateAgentInput } from '../../../../src/collection/agent-collection/CreateAgentInput';
import { getDefaultAgentVisibility } from './getDefaultAgentVisibility';

/**
 * Optional placement and visibility overrides for new agent creation.
 */
export type CreateAgentWithDefaultVisibilityOptions = Omit<CreateAgentInput, 'source'>;

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
    const visibility = options.visibility ?? (await getDefaultAgentVisibility());

    return collection.createAgent(agentSource, {
        ...options,
        visibility,
    });
}
