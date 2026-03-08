import type { MemoryToolRuntimeAdapter } from './MemoryToolRuntimeAdapter';

/**
 * Runtime adapter used by MEMORY tool functions.
 *
 * @private function of MemoryCommitmentDefinition
 */
let memoryToolRuntimeAdapter: MemoryToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by MEMORY commitment tools.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function setMemoryToolRuntimeAdapter(adapter: MemoryToolRuntimeAdapter | null): void {
    memoryToolRuntimeAdapter = adapter;
}

/**
 * Gets runtime adapter used by MEMORY commitment tools.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function getMemoryToolRuntimeAdapter(): MemoryToolRuntimeAdapter | null {
    return memoryToolRuntimeAdapter;
}
