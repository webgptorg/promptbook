import { $llmToolsMetadataRegister } from '../$llmToolsMetadataRegister';
import { $llmToolsRegister } from '../$llmToolsRegister';
import type { RegisteredLlmToolRegisters } from './RegisteredLlmToolsMessageContext';

/**
 * Takes stable snapshots of both LLM provider registers.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function getRegisteredLlmToolRegisters(): RegisteredLlmToolRegisters {
    return {
        registeredMetadata: $llmToolsMetadataRegister.list(),
        registeredTools: $llmToolsRegister.list(),
    };
}
