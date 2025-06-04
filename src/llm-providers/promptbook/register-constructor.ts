import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createPromptbookOpenAiExecutionTools } from './createPromptbookOpenAiExecutionTools';

/**
 * Registration of the Promptbook OpenAI compatible provider
 *
 * @public exported from `@promptbook/promptbook`
 */
export const _PromptbookOpenAiRegistration = $llmToolsRegister.register(createPromptbookOpenAiExecutionTools);
