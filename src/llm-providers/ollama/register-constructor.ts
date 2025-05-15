import type { Registration } from '../../utils/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createOllamaExecutionTools } from './createOllamaExecutionTools';

/**
 * Registration of LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/ollama`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _OllamaRegistration: Registration = $llmToolsRegister.register(createOllamaExecutionTools);
