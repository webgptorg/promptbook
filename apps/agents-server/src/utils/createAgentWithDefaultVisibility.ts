import type { AgentBasicInformation, AgentCollection, string_book } from '@promptbook-local/types';
import type { AgentVisibility } from './agentVisibility';
import { getDefaultAgentVisibility } from './getDefaultAgentVisibility';

/**
 * Optional placement and visibility overrides for new agent creation.
 */
type CreateAgentWithDefaultVisibilityOptions = {
    /**
     * Folder identifier to place the new agent into.
     */
    readonly folderId?: number | null;
    /**
     * Sort order within the selected folder.
     */
    readonly sortOrder?: number;
    /**
     * Explicit visibility override.
     */
    readonly visibility?: AgentVisibility;
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
    const visibility = options.visibility ?? (await getDefaultAgentVisibility());

    return collection.createAgent(agentSource, {
        ...options,
        visibility,
    });
}
