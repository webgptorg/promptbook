import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import type { CreateAgentLlmExecutionToolsOptions } from './CreateAgentLlmExecutionToolsOptions';

/**
 * Creates new AgentLlmExecutionTools that wrap underlying LLM tools with agent-specific behavior
 *
 * @public exported from `@promptbook/core`
 */
export const createAgentLlmExecutionTools = Object.assign(
    (options: CreateAgentLlmExecutionToolsOptions): AgentLlmExecutionTools => {
        return new AgentLlmExecutionTools(options);
    },
    {
        packageName: '@promptbook/core',
        className: 'AgentLlmExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
