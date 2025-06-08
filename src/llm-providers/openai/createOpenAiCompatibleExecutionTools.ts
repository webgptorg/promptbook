import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { OpenAiCompatibleExecutionTools } from './OpenAiCompatibleExecutionTools';
import type { OpenAiCompatibleExecutionToolsOptions } from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI compatible API
 *
 * Note: This can be used for any OpenAI compatible APIs
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiCompatibleExecutionTools = Object.assign(
    (options: OpenAiCompatibleExecutionToolsOptions): OpenAiCompatibleExecutionTools => {
        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OpenAiCompatibleExecutionTools(options);
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
