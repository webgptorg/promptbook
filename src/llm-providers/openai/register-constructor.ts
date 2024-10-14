import { Registration } from '../../utils/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createOpenAiExecutionTools } from './createOpenAiExecutionTools';

/**
 * Registration of LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/openai`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiRegistration: Registration = $llmToolsRegister.register(createOpenAiExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
