import { $llmToolsRegister } from '../_common/$llmToolsRegister';
import { createAnthropicClaudeExecutionTools } from './createAnthropicClaudeExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/anthropic-claude`
 * @public exported from `@promptbook/cli`
 */
export const _AnthropicClaudeRegistration = $llmToolsRegister.register(createAnthropicClaudeExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
