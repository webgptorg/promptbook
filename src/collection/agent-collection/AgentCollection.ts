import type { Promisable } from 'type-fest';
import { Agent } from '../../_packages/core.index';
import { string_book } from '../../_packages/types.index';
import type { string_agent_name } from '../../types/typeAliases';

/**
 * Collection that groups together multiple AI Agents
 *
 * Note: [🧸] There are two types of collections:
 * - `AgentCollection` - which groups together AI Agents
 * - `PipelineCollection` - which groups together *(deprecated)* pipelines
 */
export type AgentCollection = {
    /**
     * Gets all agents in the collection
     */
    listAgents(): Promisable<ReadonlyArray<string_agent_name>>;

    /**
     * Get one agent by its name
     *
     * Note: Agents are existing independently of you getting them or not, you can get the same agent multiple times.
     * Note: Agents are changed by interacting with `Agent` objects directly. Only creation and deletion is done via the collection.
     */
    getAgentByName(agentName: string_agent_name): Promisable<Agent>;

    /**
     * Deletes an agent from the collection
     *
     * Note: When you want delete an agent by name, first get the agent using `getAgentByName` and then pass it to `deleteAgent`.
     */
    deleteAgent(agent: Agent): Promisable<void>;

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     */
    createAgent(agentSource: string_book): Promisable<Agent>;
};

/**
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
