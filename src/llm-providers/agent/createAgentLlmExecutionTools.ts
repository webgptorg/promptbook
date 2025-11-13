import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Creates new AgentLlmExecutionTools that wrap underlying LLM tools with agent-specific behavior
 *
 * @public exported from `@promptbook/core`
 */
export const createAgentLlmExecutionTools = Object.assign(
    (options: CreateAgentLlmExecutionToolsOptions): AgentLlmExecutionTools => {
        /*
        if (llmTools instanceof OpenAiAssistantExecutionTools) {
            // !!!!! Leverage `OpenAiAssistantExecutionTools` specific features here
        }*/
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
