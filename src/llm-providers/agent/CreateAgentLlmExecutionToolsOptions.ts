import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = CommonToolsOptions & {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools;

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;
};
