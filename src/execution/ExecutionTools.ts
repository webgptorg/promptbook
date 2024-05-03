import type { LlmExecutionTools } from './LlmExecutionTools';
import type { ScriptExecutionTools } from './ScriptExecutionTools';
import type { UserInterfaceTools } from './UserInterfaceTools';

/**
 * All the tools needed to execute prompts (template pipelines).
 *
 * @see https://github.com/webgptorg/promptbook#execution-tools
 */
export type ExecutionTools = {
    /**
     * Tools for executing prompts to large language models like GPT-4
     */
    llm: LlmExecutionTools;

    /**
     * Tools for executing scripts
     *
     * Note: You can pass multiple ScriptExecutionTools, they will be tried one by one until one of them supports the script
     *       If none of them supports the script, an error is thrown
     */
    script: Array<ScriptExecutionTools>; // <- TODO: [🧠] Maybe not Array but Arrayable

    /**
     * Tools for interacting with the user
     */
    userInterface: UserInterfaceTools;
};

/**
 * TODO: [🍓] !!!! Allow to have more LlmExecutionTools
 */
