import type { string_javascript_name } from '../../_packages/types.index';

/**
 * Names of tools used by the USE PROJECT commitment.
 *
 * @private constant of UseProjectCommitmentDefinition
 */
export const UseProjectToolNames = {
    listFiles: 'project_list_files' as string_javascript_name,
    readFile: 'project_read_file' as string_javascript_name,
    upsertFile: 'project_upsert_file' as string_javascript_name,
    deleteFile: 'project_delete_file' as string_javascript_name,
    createBranch: 'project_create_branch' as string_javascript_name,
    createPullRequest: 'project_create_pull_request' as string_javascript_name,
} as const;
