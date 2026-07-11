import type { Registered } from '../../../../utils/misc/$Register';
import type { LlmToolsMetadata } from '../LlmToolsMetadata';
import { createRegisteredLlmToolEntryKey } from './createRegisteredLlmToolEntryKey';
import type { RegisteredLlmToolEntry } from './RegisteredLlmToolsMessageContext';

/**
 * Merges provider entries from the metadata and constructor registers.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function listRegisteredLlmToolEntries(
    registeredMetadata: ReadonlyArray<LlmToolsMetadata>,
    registeredTools: ReadonlyArray<Registered>,
): Array<RegisteredLlmToolEntry> {
    const registeredLlmToolEntries = new Map<string, RegisteredLlmToolEntry>();

    for (const { title, packageName, className, envVariables } of registeredMetadata) {
        addRegisteredLlmToolEntry(registeredLlmToolEntries, { title, packageName, className, envVariables });
    }

    for (const { packageName, className } of registeredTools) {
        addRegisteredLlmToolEntry(registeredLlmToolEntries, { packageName, className });
    }

    return [...registeredLlmToolEntries.values()];
}

/**
 * Adds a provider entry only when the provider is not already present.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function addRegisteredLlmToolEntry(
    registeredLlmToolEntries: Map<string, RegisteredLlmToolEntry>,
    registeredLlmToolEntry: RegisteredLlmToolEntry,
): void {
    const registeredLlmToolEntryKey = createRegisteredLlmToolEntryKey(registeredLlmToolEntry);

    if (registeredLlmToolEntries.has(registeredLlmToolEntryKey)) {
        return;
    }

    registeredLlmToolEntries.set(registeredLlmToolEntryKey, registeredLlmToolEntry);
}
