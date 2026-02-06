import type { Registration } from '../../utils/misc/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createOpenAiAssistantExecutionTools } from './createOpenAiAssistantExecutionTools';
import { createOpenAiCompatibleExecutionTools } from './createOpenAiCompatibleExecutionTools';
import { createOpenAiExecutionTools } from './createOpenAiExecutionTools';
// Note: OpenAiCompatibleExecutionTools is an abstract class and cannot be instantiated directly

/**
 * Registration of LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/openai`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiRegistration: Registration = $llmToolsRegister.register(createOpenAiExecutionTools);

/**
 * Registration of the OpenAI Assistant provider
 *
 * Note: [🏐] Configurations registrations are done in register-constructor.ts BUT constructor register-constructor.ts
 *
 * @public exported from `@promptbook/openai`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiAssistantRegistration = $llmToolsRegister.register(createOpenAiAssistantExecutionTools);

/**
 * Registration of the OpenAI Compatible provider
 *
 * Note: [🏐] Configurations registrations are done in register-constructor.ts BUT constructor register-constructor.ts
 *
 * @public exported from `@promptbook/openai`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiCompatibleRegistration = $llmToolsRegister.register(createOpenAiCompatibleExecutionTools);

/**
 * Note: OpenAiCompatibleExecutionTools is an abstract class and cannot be registered directly.
 * It serves as a base class for OpenAiExecutionTools and other compatible implementations.
 */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
