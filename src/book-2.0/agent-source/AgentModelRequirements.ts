import { string_knowledge_source_link } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Model requirements for an agent
 *
 * This is like "compiled" version of agent source
 */
export type AgentModelRequirements = {
    /**
     * The system message that defines the agent's behavior and personality
     */
    readonly systemMessage: string;

    /**
     * The model name to use for this agent
     */
    readonly modelName: string;

    /**
     * Optional list of MCP servers that the agent can connect to
     */
    readonly mcpServers?: ReadonlyArray<string>;

    /**
     * Optional list of knowledge source links that the agent can use
     */
    readonly knowledgeSources?: ReadonlyArray<string_knowledge_source_link>;

    /**
     * Temperature for the agent's responses, controlling randomness
     */
    readonly temperature?: number;

    /**
     * Top-p sampling value for the agent's responses
     */
    readonly topP?: number;

    /**
     * Top-k sampling value for the agent's responses
     */
    readonly topK?: number;

    /**
     * Arbitrary metadata storage for commitments
     * Each commitment can store its own data here
     */
    readonly metadata?: Record<string, TODO_any>;
};
// <- TODO: In future this will be ModelRequirements from `@promptbook/type`s, but for now we keep it here

/**
 * TODO: [🐤] DRY `AgentModelRequirements` and `ModelRequirements`
 */
