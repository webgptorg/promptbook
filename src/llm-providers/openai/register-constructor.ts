import { $llmToolsRegister } from '../_common/$llmToolsRegister';
import { createOpenaiExecutionTools } from './createOpenAiExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/openai`
 */
export const _OpenaiExecutionToolsRegistration = $llmToolsRegister.register(createOpenaiExecutionTools);
