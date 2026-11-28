import type { Registered } from '../../../../utils/misc/$Register';
import { createRegisteredLlmToolEntryKey } from './createRegisteredLlmToolEntryKey';

/**
 * Checks whether the given provider entry already exists in the target register list.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function hasRegisteredLlmToolEntry(
    registeredLlmToolEntries: ReadonlyArray<Registered>,
    registeredLlmToolEntry: Registered,
): boolean {
    const registeredLlmToolEntryKey = createRegisteredLlmToolEntryKey(registeredLlmToolEntry);

    return registeredLlmToolEntries.some(
        (listedRegisteredLlmToolEntry) =>
            createRegisteredLlmToolEntryKey(listedRegisteredLlmToolEntry) === registeredLlmToolEntryKey,
    );
}
