import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_agent_url, string_knowledge_source_link } from '../../types/typeAliases';
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
     * Optional link to the parent agent from which this agent inherits
     *
     * Note: [🆓] There are several cases what the agent ancestor could be:
     * -  1) `parentAgentUrl` is `string_agent_url` valid agent URL
     * -  2) `parentAgentUrl` is explicitly `null` (forcefully no parent)
     * -  3) `parentAgentUrl` is not defined `undefined`,  the default ancestor agent, Adam,  will be used
     */
    readonly parentAgentUrl?: string_agent_url | null;

    /**
     * List of imported agent URLs
     */
    readonly importedAgentUrls?: ReadonlyArray<string_agent_url>;

    /**
     * List of imported file URLs or paths
     */
    readonly importedFileUrls?: ReadonlyArray<string>;

    /**
     * Optional list of knowledge source links that the agent can use
     */
    readonly knowledgeSources?: ReadonlyArray<string_knowledge_source_link>;

    /**
     * List of sample conversations (question/answer pairs)
     */
    readonly samples?: ReadonlyArray<{ question: string | null; answer: string }>;

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
     * Tools available for the agent
     */
    readonly tools?: ReadonlyArray<LlmToolDefinition>;

    /**
     * Arbitrary metadata storage for commitments
     * Each commitment can store its own data here
     */
    readonly metadata?: Record<string, TODO_any>;

    /**
     * Notes associated with the agent
     *
     * Note: This does not affect agent behavior in any way
     */
    readonly notes?: ReadonlyArray<string>;
};
// <- TODO: In future this will be ModelRequirements from `@promptbook/type`s, but for now we keep it here

/**
 * TODO: [🐤] DRY `AgentModelRequirements` and `ModelRequirements`
 */
