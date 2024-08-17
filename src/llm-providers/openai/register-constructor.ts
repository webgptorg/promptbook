import { $llmToolsRegister } from '../_common/$llmToolsRegister';
import { createOpenAiExecutionTools } from './createOpenAiExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/openai`
 */
export const _OpenAiExecutionToolsRegistration = $llmToolsRegister.register(createOpenAiExecutionTools);
