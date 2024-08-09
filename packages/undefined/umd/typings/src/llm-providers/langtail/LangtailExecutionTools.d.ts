import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';
/**
 * Execution Tools for calling OpenAI API.
 *
 * @public exported from `@promptbook/langtail`
 */
export declare class LangtailExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
}
/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 */ 
