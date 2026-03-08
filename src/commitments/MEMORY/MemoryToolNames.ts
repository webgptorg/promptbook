import type { string_javascript_name } from '../../_packages/types.index';

/**
 * Names of tools used by the MEMORY commitment.
 *
 * @private function of MemoryCommitmentDefinition
 */
export const MemoryToolNames = {
    retrieve: 'retrieve_user_memory' as string_javascript_name,
    store: 'store_user_memory' as string_javascript_name,
    update: 'update_user_memory' as string_javascript_name,
    delete: 'delete_user_memory' as string_javascript_name,
} as const;
