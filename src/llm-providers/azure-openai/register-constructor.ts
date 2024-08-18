import { $llmToolsRegister } from '../_common/$llmToolsRegister';
import { createAzureOpenAiExecutionTools } from './createAzureOpenAiExecutionTools';

/**
 * @@@ registration2
 *
 * Note: [🏐] Configurations registrations are done in @@@ BUT constructor @@@
 *
 * @public exported from `@promptbook/azure-openai`
 */
export const _AzureOpenAiRegistration = $llmToolsRegister.register(createAzureOpenAiExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
