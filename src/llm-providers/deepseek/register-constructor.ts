import type { Registration } from '../../utils/misc/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createDeepseekExecutionTools } from './createDeepseekExecutionTools';

/**
 * Registration of LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/deepseek`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _DeepseekRegistration: Registration = $llmToolsRegister.register(createDeepseekExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
