import { Register } from '../../utils/Register';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $llmToolsConfigurationBoilerplatesRegister = new Register<LlmToolsConfiguration[number]>([
    // TODO: !!!!!! Take from global scope
]);
