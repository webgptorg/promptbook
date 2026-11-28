import type { Registered } from '../../../../utils/misc/$Register';

/**
 * Creates a deduplication key for a provider entry.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function createRegisteredLlmToolEntryKey({ packageName, className }: Registered): string {
    return `${packageName}::${className}`;
}
