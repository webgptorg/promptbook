import { AGENT_PROJECT_INDEX_HTML_FILE_NAMES } from './agentProjectFileNames';
import { readAgentProjectRootTextFile, type AgentProjectRootTextFile } from './readAgentProjectRootTextFile';

/**
 * HTML entrypoint loaded from one agent project.
 */
export type AgentProjectIndexHtml = AgentProjectRootTextFile;

/**
 * Reads the first recognized HTML entrypoint from an agent project.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns HTML entrypoint content, or null when the project has no recognized entrypoint.
 */
export async function readAgentProjectIndexHtml(projectPath: string): Promise<AgentProjectIndexHtml | null> {
    return readAgentProjectRootTextFile({
        projectPath,
        fileNames: AGENT_PROJECT_INDEX_HTML_FILE_NAMES,
    });
}
