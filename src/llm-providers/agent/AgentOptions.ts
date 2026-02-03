import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Updatable } from '../../types/Updatable';
import { Agent } from './Agent';

/**
 * Options for creating an Agent
 */
export type AgentOptions = CommonToolsOptions & {
    /**
     * The execution tools available to the agent
     *
     * Here the agent has access to various LLM models, browser, scrapers, LibreOffice, tools, etc.
     */
    executionTools: ExecutionTools;

    /**
     * The source of the agent
     */
    agentSource: Updatable<string_book>;

    /**
     * Teacher agent for self-learning
     *
     * Note: If provided, the agent can do full self-learning from the teacher agent during its operation.
     */
    teacherAgent: Agent | null;

    /**
     * Cached prepared externals from database (e.g., OpenAI Assistant ID)
     * Used to avoid recreating assistants when they already exist
     */
    preparedExternals?: {
        /**
         * The OpenAI Assistant ID that was previously created
         */
        openAiAssistantId?: string;
        
        /**
         * Hash of the requirements used to create the assistant
         * Used to detect if the assistant needs to be updated
         */
        requirementsHash?: string;
    } | null;

    /**
     * Callback to persist prepared externals to database
     * Called when a new assistant is created or updated
     */
    onPreparedExternalsUpdate?: (preparedExternals: {
        openAiAssistantId: string;
        requirementsHash: string;
    }) => void;
};
