import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../utils/environment/$isRunningInWebWorker';
import { OpenAiAgentExecutionTools } from './OpenAiAgentExecutionTools';
import type { OpenAiAgentExecutionToolsOptions } from './OpenAiAgentExecutionTools';

/**
 * Execution Tools for calling OpenAI API using Responses API
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiAgentExecutionTools = Object.assign(
    (options: OpenAiAgentExecutionToolsOptions): OpenAiAgentExecutionTools => {
        if (($isRunningInBrowser() || $isRunningInWebWorker()) && !options.dangerouslyAllowBrowser) {
            options = { ...options, dangerouslyAllowBrowser: true };
        }

        return new OpenAiAgentExecutionTools(options);
    },
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiAgentExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;
