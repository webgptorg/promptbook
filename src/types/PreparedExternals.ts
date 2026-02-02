import type { string_agent_hash } from './typeAliases';

/**
 * Represents the prepared externals for an agent.
 * This is used to cache external resources like OpenAI Assistants.
 *
 * @🚉 Fully serializable as JSON
 */
export type PreparedExternals = {
    /**
     * The ID of the OpenAI Assistant.
     */
    openAiAssistantId?: string;

    /**
     * The hash of the agent requirements for which the assistant was prepared.
     */
    requirementsHash?: string_agent_hash;

    // <- Note: Future expansion for other external resources (vector stores, etc.)
};
