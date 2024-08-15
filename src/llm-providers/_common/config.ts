import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { createAnthropicClaudeExecutionTools } from '../anthropic-claude/createAnthropicClaudeExecutionTools';
import { AzureOpenAiExecutionTools } from '../azure-openai/AzureOpenAiExecutionTools';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @public exported from `@promptbook/core`
 */
export const LLM_CONFIGURATION_BOILERPLATES: LlmToolsConfiguration = [
    {
        title: 'Open AI',
        packageName: '@promptbook/openai',
        className: 'OpenAiExecutionTools',
        options: {
            apiKey: 'sk-',
        },
    },
    {
        title: 'Anthropic Claude',
        packageName: '@promptbook/anthropic-claude',
        className: 'AnthropicClaudeExecutionTools',
        options: {
            apiKey: 'sk-ant-api03-',
            isProxied: true,
            remoteUrl: `https://api.pavolhejny.com/`, //  <- TODO: !!!!!! To config DEFAULT_REMOTE_URL
            path: '/promptbook/socket.io', //  <- TODO: !!!!!! To config DEFAULT_REMOTE_URL_PATH
        },
    },
    {
        title: 'Azure Open AI',
        packageName: '@promptbook/azure-openai',
        className: 'AzureOpenAiExecutionTools',
        options: {
            // TODO: !!!> resourceName
            // TODO: !!!> deploymentName
            apiKey: 'sk-',
        },
    },
    // <- TODO: !!!!!! To config

    // <- Note: [🦑] Add here new LLM provider
];

/**
 * @private internal type for `createLlmToolsFromConfiguration`
 */
export const EXECUTION_TOOLS_CLASSES: Record<`create${string}`, (options: TODO_any) => LlmExecutionTools> = {
    createOpenAiExecutionTools: (options: TODO_any) =>
        new OpenAiExecutionTools({
            ...options,
            dangerouslyAllowBrowser:
                true /* <- TODO: [🧠] !!! Some mechanism for auto-detection of browser, maybe hide in `OpenAiExecutionTools` */,
        }),
    createAnthropicClaudeExecutionTools,
    createAzureOpenAiExecutionTools: (options: TODO_any) => new AzureOpenAiExecutionTools(options),

    // <- Note: [🦑] Add here new LLM provider
};

/**
 * TODO: [🧠] Better file name than `config.ts` + maybe move to two separate files
 * TODO: [🧠][🎌] Adding this should be responsibility of each provider package NOT this one central place
 */
