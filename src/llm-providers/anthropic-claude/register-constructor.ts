import { $llmToolsRegister } from '../_common/$llmToolsRegister';
import { createAnthropicClaudeExecutionTools } from './createAnthropicClaudeExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/anthropic-claude`
 */
export const _AnthropicClaudeExecutionToolsRegistration = $llmToolsRegister.register(
    createAnthropicClaudeExecutionTools,
);
