import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiExecutionTools = Object.assign(
    (options: OpenAiExecutionToolsOptions): OpenAiExecutionTools => {
        // TODO: [🧠] !!!! If browser, auto add `dangerouslyAllowBrowser`

        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OpenAiExecutionTools(options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
