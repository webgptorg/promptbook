import { DEFAULT_REMOTE_URL, DEFAULT_REMOTE_URL_PATH } from '../../config';
import { $llmToolsConfigurationBoilerplatesRegister } from '../_common/$llmToolsConfigurationBoilerplatesRegister';

/**
 * @@@ registration1 of default configuration for Anthropic Claude
 * 
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/core`
 */
export const _AnthropicClaudeExecutionToolsRegistration = $llmToolsConfigurationBoilerplatesRegister.register({
    title: 'Anthropic Claude',
    packageName: '@promptbook/anthropic-claude',
    className: 'AnthropicClaudeExecutionTools',
    options: {
        apiKey: 'sk-ant-api03-',
        isProxied: true,
        remoteUrl: DEFAULT_REMOTE_URL,
        path: DEFAULT_REMOTE_URL_PATH,
    },
});
