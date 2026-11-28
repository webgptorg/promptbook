import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { OpenAiAgentKitExecutionTools } from '../openai/OpenAiAgentKitExecutionTools';
import type { OpenAiAssistantExecutionTools } from '../openai/OpenAiAssistantExecutionTools';
// <- TODO: !!! Keep imported only the type of OpenAiAssistantExecutionTools

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = CommonToolsOptions & {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools | OpenAiAssistantExecutionTools | OpenAiAgentKitExecutionTools;

    /**
     * How to manage OpenAI assistant/AgentKit preparation when using OpenAiAssistantExecutionTools
     * or OpenAiAgentKitExecutionTools.
     *
     * Use `external` when an external cache manager already created the assistant/AgentKit agent
     * and the agent should use it as-is.
     *
     * @default internal
     */
    assistantPreparationMode?: 'internal' | 'external';

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;

    /**
     * Optional precomputed model requirements reused until `agentSource` changes.
     *
     * This is useful for runtimes such as Agents Server that already resolved compact
     * references (for example in `TEAM`) and need the executed prompt to stay aligned
     * with the server-prepared tool list.
     */
    precomputedModelRequirements?: AgentModelRequirements;
};
