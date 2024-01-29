import type { PromptResult } from '../../execution/PromptResult';
import type { NaturalTemplateJson } from '../PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * ExecutionReport is result of executing one promptbook
 * It is kind of a variant of the promptbook usefull for debugging, logging and transparency for users.
 *
 * It can have 2 formats:
 * -   **.md file** created from the **JSON** format
 * -   _(this)_ **JSON** format
 *
 * @see https://github.com/webgptorg/promptbook#execution-report
 */
export type ExecutionReportJson = Array<{
    prompt: NaturalTemplateJson /* <- TODO: [🧠] Shouldn’t it be here `PromptTemplateJson`; in other words, should we put other template types that LLM execution into the report */;
    result: PromptResult;
}>;
