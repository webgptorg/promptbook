import { createRegisteredLlmToolStatus } from './createRegisteredLlmToolStatus';
import { listRegisteredLlmToolEntries } from './listRegisteredLlmToolEntries';
import type {
    AvailableEnvironmentVariables,
    RegisteredLlmToolRegisters,
    RegisteredLlmToolStatus,
} from './RegisteredLlmToolsMessageContext';

/**
 * Lists provider entries enriched with installation and configuration state.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function listRegisteredLlmToolStatuses(
    { registeredMetadata, registeredTools }: RegisteredLlmToolRegisters,
    env: AvailableEnvironmentVariables,
): Array<RegisteredLlmToolStatus> {
    return listRegisteredLlmToolEntries(registeredMetadata, registeredTools).map((registeredLlmToolEntry) =>
        createRegisteredLlmToolStatus({ registeredLlmToolEntry, registeredMetadata, registeredTools, env }),
    );
}
