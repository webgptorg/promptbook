import type { LlmExecutionToolsConstructor } from '../../../execution/LlmExecutionToolsConstructor';
import { $Register } from '../../../utils/misc/$Register';

/**
 * Register for LLM tools.
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but there can be more instances across different builds or environments.
 * @public exported from `@promptbook/core`
 */
export const $llmToolsRegister = new $Register<LlmExecutionToolsConstructor>('llm_execution_tools_constructors');

/**
 * TODO: [®] DRY Register logic
 */
