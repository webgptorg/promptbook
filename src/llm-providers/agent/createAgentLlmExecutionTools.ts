import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';

/**
 * Options for creating AgentLlmExecutionTools
 */
export type CreateAgentLlmExecutionToolsOptions = {
    /**
     * The underlying LLM execution tools to wrap
     */
    llmTools: LlmExecutionTools;

    /**
     * The agent source string that defines the agent's behavior
     */
    agentSource: string_book;
};

/**
 * Creates new AgentLlmExecutionTools that wrap underlying LLM tools with agent-specific behavior
 *
 * @public exported from `@promptbook/core`
 */
export const createAgentLlmExecutionTools = Object.assign(
    (options: CreateAgentLlmExecutionToolsOptions): AgentLlmExecutionTools => {
        return new AgentLlmExecutionTools(options.llmTools, options.agentSource);
    },
    {
        packageName: '@promptbook/core',
        className: 'AgentLlmExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🧠] Consider adding validation for agent source format
 * TODO: [🧠] Consider adding options for caching behavior
 */
