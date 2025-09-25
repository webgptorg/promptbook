import type { Registration } from '../../utils/$Register';
import { $llmToolsRegister } from '../_common/register/$llmToolsRegister';
import { createAgentLlmExecutionTools } from './createAgentLlmExecutionTools';

/**
 * Registration of Agent LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/core`
 */
export const _AgentRegistration: Registration = $llmToolsRegister.register(createAgentLlmExecutionTools);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
