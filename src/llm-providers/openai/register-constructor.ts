import { Registration } from '../../utils/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createOpenAiExecutionTools } from './createOpenAiExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/openai`
 * @public exported from `@promptbook/cli`
 */
export const _OpenAiRegistration: Registration = $llmToolsRegister.register(createOpenAiExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
