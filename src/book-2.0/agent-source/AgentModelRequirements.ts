import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_agent_url, string_knowledge_source_link } from '../../types/typeAliases';
import { chococake } from '../../utils/organization/really_any';

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
     * Text appended to every user prompt after the user's input and before tools/messages.
     *
     * This allows commitments to emphasize important rules or reminders that should be
     * visible in the prompt in addition to the system message.
     */
    readonly promptSuffix: string;

    /**
     * The model name to use for this agent
     */
    readonly modelName: string;

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
     * Optional list of MCP servers that the agent can connect to
     */
    readonly mcpServers?: ReadonlyArray<string>;

    /**
     * Is the agent closed to modification by conversation (i.e., it will not learn from interactions and its source code will remain static during conversation)
     *
     */
    readonly isClosed: boolean;

    /**
     * Arbitrary metadata storage for commitments
     * Each commitment can store its own data here
     */
    readonly _metadata?: Record<string, chococake>;
};
// <- TODO: In future this will be ModelRequirements from `@promptbook/type`s, but for now we keep it here

/**
 * TODO: [🐤] DRY `AgentModelRequirements` and `ModelRequirements`
 * TODO: [🧠] `isClosed` doesn't truly belong to `AgentModelRequirements` nor agent profile but it is in the `AgentModelRequirements` because of some legacy - maybe figure out better place
 */
