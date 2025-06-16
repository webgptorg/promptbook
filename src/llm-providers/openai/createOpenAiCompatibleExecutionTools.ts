import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { RemoteLlmExecutionTools } from '../remote/RemoteLlmExecutionTools';
import { OpenAiCompatibleExecutionTools } from './OpenAiCompatibleExecutionTools';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';

/**
 * Execution Tools for calling OpenAI compatible API
 *
 * Note: This can be used for any OpenAI compatible APIs
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiCompatibleExecutionTools = Object.assign(
    (options: OpenAiCompatibleExecutionToolsOptions): OpenAiCompatibleExecutionTools | RemoteLlmExecutionTools => {
        if (options.isProxied) {
            return new RemoteLlmExecutionTools({
                ...options,
                identification: {
                    isAnonymous: true,
                    llmToolsConfiguration: [
                        {
                            title: 'OpenAI Compatible (proxied)',
                            packageName: '@promptbook/openai',
                            className: 'OpenAiCompatibleExecutionTools',
                            options: {
                                ...options,
                                isProxied: false,
                            },
                        },
                    ],
                },
            });
        }

        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OpenAiExecutionTools(options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiCompatibleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
