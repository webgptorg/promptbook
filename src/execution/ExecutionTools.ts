import type { Arrayable } from '../types/Arrayable';
import { FilesystemTools } from './FilesystemTools';
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
     * Tip: Use `createLlmToolsFromEnv()` to use all available LLM providers you configured
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#llm-execution-tools
     */
    readonly llm?: Arrayable<LlmExecutionTools>;

    /**
     * Tools for retrieving files
     */
    readonly filesystem?: FilesystemTools;

    /**
     * Tools for executing scripts
     *
     * Note: You can pass multiple ScriptExecutionTools, they will be tried one by one until one of them supports the script
     *       If none of them supports the script, an error is thrown
     * Tip: Use here `new JavascriptExecutionTools()`
     *
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#script-execution-tools
     * @default [] - If not provided, no script execution will be possible
     */
    readonly script?: Arrayable<ScriptExecutionTools>;

    /**
     * Tools for interacting with the user
     *
     * Note: When undefined, the user interface is disabled and promptbook which requires user interaction will fail
     * @see https://github.com/webgptorg/promptbook/?tab=readme-ov-file#user-interface-tools
     */
    readonly userInterface?: UserInterfaceTools;
};
