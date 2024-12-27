import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { OpenAiAssistantExecutionTools } from './OpenAiAssistantExecutionTools';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiAssistantExecutionTools = Object.assign(
    (options: OpenAiAssistantExecutionToolsOptions): OpenAiAssistantExecutionTools => {
        // TODO: [🧠][main] !!!! If browser, auto add `dangerouslyAllowBrowser`

        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OpenAiAssistantExecutionTools(options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiAssistantExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
