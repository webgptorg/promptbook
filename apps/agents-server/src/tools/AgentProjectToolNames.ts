import type { string_javascript_name } from '../../../../src/_packages/types.index';

/**
 * Names of runtime tools used by agents to work with local server projects.
 */
export const AgentProjectToolNames = {
    listProjects: 'agent_project_list' as string_javascript_name,
    createProject: 'agent_project_create' as string_javascript_name,
    listFiles: 'agent_project_list_files' as string_javascript_name,
    readFile: 'agent_project_read_file' as string_javascript_name,
    writeFile: 'agent_project_write_file' as string_javascript_name,
    deletePath: 'agent_project_delete_path' as string_javascript_name,
    runScript: 'agent_project_run_script' as string_javascript_name,
    git: 'agent_project_git' as string_javascript_name,
    linkFile: 'agent_project_link_file' as string_javascript_name,
} as const;
