// import type { Promisable } from 'type-fest';
// import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
// import type { string_book } from '../../book-2.0/agent-source/string_book';
// import { Agent } from '../../llm-providers/agent/Agent';
// import type { string_agent_name } from '../../types/typeAliases';
import { AgentCollectionInSupabase } from './constructors/agent-collection-in-supabase/AgentCollectionInSupabase';

/**
 * Collection that groups together multiple AI Agents
 *
 * Note: [🧸] There are two types of collections:
 * - `AgentCollection` - which groups together AI Agents
 * - `PipelineCollection` - which groups together *(deprecated)* pipelines
 */
export type AgentCollection = AgentCollectionInSupabase;

/*
{
    /**
     * Gets all agents in the collection
     * /
    listAgents(): Promisable<ReadonlyArray<AgentBasicInformation>>;

    /**
     * Get one agent by its name
     *
     * Note: !!!! Agents are existing independently of you getting them or not, you can get the same agent multiple times.
     * Note: Agents are changed by interacting with `Agent` objects directly. Only creation and deletion is done via the collection.
     * /
    spawnAgent(agentName: string_agent_name): Promisable<Agent>;
    // <- TODO: [🧠] What is the best name `runAgent`, `loadAgent`, `startAgent`,...?

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     * /
    createAgent(agentSource: string_book): Promisable<AgentBasicInformation>;

    /**
     * Deletes an agent from the collection
     * /
    deleteAgent(agentName: string_agent_name): Promisable<void>;
};
*/

/**
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
