import { $isRunningInNode } from '../../../../utils/environment/$isRunningInNode';
import { USED_ENV_FILENAME } from './USED_ENV_FILENAME';
import { getAvailableRegisteredLlmToolsEnvironmentVariables } from './getAvailableRegisteredLlmToolsEnvironmentVariables';
import { getRegisteredLlmToolRegisters } from './getRegisteredLlmToolRegisters';
import { listRegisteredLlmToolStatuses } from './listRegisteredLlmToolStatuses';
import type { RegisteredLlmToolsMessageContext } from './RegisteredLlmToolsMessageContext';

/**
 * Collects all state needed to render the provider summary.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function createRegisteredLlmToolsMessageContext(): RegisteredLlmToolsMessageContext {
    const isRunningInNode = $isRunningInNode();
    const env = getAvailableRegisteredLlmToolsEnvironmentVariables(isRunningInNode);
    const registeredLlmToolRegisters = getRegisteredLlmToolRegisters();

    return {
        env,
        llmToolStatuses: listRegisteredLlmToolStatuses(registeredLlmToolRegisters, env),
        usedEnvMessage: USED_ENV_FILENAME.createMessage(),
        isRunningInNode,
    };
}
