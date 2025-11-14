import type { string_book } from '../../_packages/types.index';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
// <- TODO: !!! Keep imported only the type of OpenAiAssistantExecutionTools

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools | OpenAiAssistantExecutionTools;

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;
};
