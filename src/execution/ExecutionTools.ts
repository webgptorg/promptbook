import { NaturalExecutionTools } from './NaturalExecutionTools';
import { ScriptExecutionTools } from './ScriptExecutionTools';
import { UserInterfaceTools } from './UserInterfaceTools';

/**
 * All the tools needed to execute prompts (template pipelines).
 *
 * @see https://github.com/webgptorg/promptbook#execution-tools
 */
export type ExecutionTools = {
    /**
     * Tools for executing prompts to large language models like GPT-4
     */
    natural: NaturalExecutionTools;

    /**
     * Tools for executing scripts
     *
     * Note: You can pass multiple ScriptExecutionTools, they will be tried one by one until one of them supports the script
     *       If none of them supports the script, an error is thrown
     */
    script: Array<ScriptExecutionTools>;

    /**
     * Tools for interacting with the user
     */
    userInterface: UserInterfaceTools;
};
