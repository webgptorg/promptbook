import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PreparedExternals } from '../../types/PreparedExternals';
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
     * Callback for updating prepared externals.
     * This is called when a new external resource (like OpenAI Assistant) is created.
     */
    onPreparedExternalsUpdate?: (preparedExternals: PreparedExternals) => void;

    /**
     * Initial prepared externals (if any) to use for caching.
     */
    preparedExternals?: PreparedExternals;
};
