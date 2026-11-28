import { readAgentProjectRootTextFile, type AgentProjectRootTextFile } from './readAgentProjectRootTextFile';

/**
 * README filenames recognized inside project roots, ordered by display priority.
 */
const AGENT_PROJECT_README_FILE_NAMES = ['readme.md', 'readme.markdown', 'readme.txt', 'readme'] as const;

/**
 * README file loaded from one agent project.
 */
export type AgentProjectReadme = AgentProjectRootTextFile;

/**
 * Reads the first recognized README file from a project directory.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns README content, or `null` when the project has no recognized README file.
 */
export async function readAgentProjectReadme(projectPath: string): Promise<AgentProjectReadme | null> {
    return readAgentProjectRootTextFile(projectPath, AGENT_PROJECT_README_FILE_NAMES);
}
