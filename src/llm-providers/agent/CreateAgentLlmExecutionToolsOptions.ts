import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { OpenAiAgentKitExecutionTools } from '../openai/OpenAiAgentKitExecutionTools';
import { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
// <- TODO: !!! Keep imported only the type of OpenAiAssistantExecutionTools

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = CommonToolsOptions & {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools | OpenAiAgentKitExecutionTools | OpenAiAssistantExecutionTools;

    /**
     * How to manage OpenAI agent preparation when using OpenAiAgentKitExecutionTools
     * or OpenAiAssistantExecutionTools (deprecated).
     *
     * Use `external` when an external cache manager already created the assistant and
     * the agent should use it as-is.
     *
     * @default internal
     */
    assistantPreparationMode?: 'internal' | 'external';

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;
};
