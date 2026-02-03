import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
// <- TODO: !!! Keep imported only the type of OpenAiAssistantExecutionTools

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = CommonToolsOptions & {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools | OpenAiAssistantExecutionTools;

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;

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
