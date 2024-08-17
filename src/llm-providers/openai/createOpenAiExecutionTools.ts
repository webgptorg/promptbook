import { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';
import { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';

/**
 * Execution Tools for calling OpenAI API
 *
 * @public exported from `@promptbook/openai`
 */
export const createOpenAiExecutionTools = Object.assign(
    {
        packageName: '@promptbook/openai',
        className: 'OpenAiExecutionTools',
        //------------
    },
    (options: OpenAiExecutionToolsOptions): OpenAiExecutionTools => {
        // TODO: !!!!!! If browser, auto add `dangerouslyAllowBrowser`
        return new OpenAiExecutionTools(options);
    },
) satisfies LlmExecutionToolsConstructor;

console.log({ createOpenAiExecutionTools });
