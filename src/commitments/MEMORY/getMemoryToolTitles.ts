import type { string_javascript_name } from '../../_packages/types.index';
import { MemoryToolNames } from './MemoryToolNames';

/**
 * Gets human-readable titles for MEMORY tool functions.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function getMemoryToolTitles(): Record<string_javascript_name, string> {
    return {
        [MemoryToolNames.retrieve]: 'User memory',
        [MemoryToolNames.store]: 'Store user memory',
        [MemoryToolNames.update]: 'Update user memory',
        [MemoryToolNames.delete]: 'Delete user memory',
    };
}
