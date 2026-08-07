import { AGENT_PROJECT_INDEX_HTML_FILE_NAMES } from './agentProjectFileNames';
import { parseAgentProjectIndexHtml, type AgentProjectIndexHtmlProfile } from './parseAgentProjectIndexHtml';
import { readAgentProjectRootTextFile } from './readAgentProjectRootTextFile';

/**
 * Reads the presentation of one project from the `index.html` in its root.
 *
 * Only the root `index.html` is read, because it is the document the project serves on its own
 * public URL — a nested one belongs to a build output or to a subpage of the project.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns Title and icon href of the project, or `null` when the project has no `index.html`.
 */
export async function readAgentProjectIndexHtmlProfile(
    projectPath: string,
): Promise<AgentProjectIndexHtmlProfile | null> {
    const indexHtml = await readAgentProjectRootTextFile(projectPath, AGENT_PROJECT_INDEX_HTML_FILE_NAMES);

    if (indexHtml === null) {
        return null;
    }

    return parseAgentProjectIndexHtml(indexHtml.content);
}
