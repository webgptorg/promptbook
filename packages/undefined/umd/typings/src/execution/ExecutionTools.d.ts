import type { Arrayable } from '../types/Arrayable';
import type { LlmExecutionTools } from './LlmExecutionTools';
import type { ScriptExecutionTools } from './ScriptExecutionTools';
import type { UserInterfaceTools } from './UserInterfaceTools';
/**
 * All the tools needed to execute pipelines.
 *
 * @see https://github.com/webgptorg/promptbook#execution-tools
 */
export type ExecutionTools = {
    /**
     * Tools for executing prompts to large language models like GPT-4
     *
     * Tip: Combine multiple LLM execution tools - use array of LlmExecutionTools instead of single LlmExecutionTools
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#llm-execution-tools
     */
    llm?: Arrayable<LlmExecutionTools>;
    /**
     * Tools for executing scripts
     *
     * Note: You can pass multiple ScriptExecutionTools, they will be tried one by one until one of them supports the script
     *       If none of them supports the script, an error is thrown
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#script-execution-tools
     */
    script?: Arrayable<ScriptExecutionTools>;
    /**
     * Tools for interacting with the user
     *
     * Note: When undefined, the user interface is disabled and promptbook which requires user interaction will fail
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#user-interface-tools
     */
    userInterface?: UserInterfaceTools;
};
