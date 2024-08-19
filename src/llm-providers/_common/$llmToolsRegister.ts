import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $Register } from '../../utils/$Register';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $llmToolsRegister = new $Register<LlmExecutionToolsConstructor>('llm_execution_tools_constructors');
