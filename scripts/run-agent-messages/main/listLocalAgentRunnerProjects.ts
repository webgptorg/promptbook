import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { AGENT_BOOK_FILE_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';

/**
 * One local direct-child repository that looks like a Promptbook agent runner project.
 */
export type LocalAgentRunnerProject = {
    readonly directoryName: string;
    readonly projectPath: string;
};

/**
 * Lists local agent runner repositories from direct child directories of the given root.
 */
export async function listLocalAgentRunnerProjects(rootPath: string): Promise<ReadonlyArray<LocalAgentRunnerProject>> {
    const directoryEntries = await readdir(rootPath, { withFileTypes: true });
    const projectCandidates = directoryEntries.filter((directoryEntry) => directoryEntry.isDirectory());
    const detectedProjects = await Promise.all(
        projectCandidates.map(async (directoryEntry) => {
            const projectPath = join(rootPath, directoryEntry.name);

            if (!(await isAgentRunnerProject(projectPath))) {
                return null;
            }

            return {
                directoryName: directoryEntry.name,
                projectPath,
            } satisfies LocalAgentRunnerProject;
        }),
    );

    return detectedProjects
        .filter((project): project is LocalAgentRunnerProject => project !== null)
        .sort((firstProject, secondProject) => firstProject.directoryName.localeCompare(secondProject.directoryName));
}

/**
 * Returns true when one direct-child directory contains the expected `agent.book` file.
 */
async function isAgentRunnerProject(projectPath: string): Promise<boolean> {
    try {
        const agentBookStats = await stat(join(projectPath, AGENT_BOOK_FILE_PATH));
        return agentBookStats.isFile();
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * Returns true when one filesystem error indicates a missing path.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
