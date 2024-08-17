import { TODO_any } from '../../_packages/types.index';
import { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { Register, Registered } from '../../utils/Register';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $llmToolsRegister = new Register<LlmExecutionToolsConstructor>([
    // TODO: !!!!!! Take from global scope
]);
