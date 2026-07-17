import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import type { AgentProjectInfo } from './AgentProjectInfo';
import { resolveAgentProjectsRootPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { measureDirectoryUsage } from './measureDirectoryUsage';

/**
 * Lists all projects of one agent from its local `projects/` folder.
 *
 * A missing projects folder is reported as an empty list — the folder is created lazily
 * when the agent (or the runner) first needs it.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Projects of the agent ordered by project name.
 */
export async function listAgentProjects(agentPermanentId: string): Promise<ReadonlyArray<AgentProjectInfo>> {
    const projectsRootPath = resolveAgentProjectsRootPath(agentPermanentId);

    let projectsRootEntries;
    try {
        projectsRootEntries = await readdir(projectsRootPath, { withFileTypes: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            return [];
        }

        throw error;
    }

    const projects = await Promise.all(
        projectsRootEntries
            .filter((projectsRootEntry) => projectsRootEntry.isDirectory())
            .map(async (projectDirectoryEntry): Promise<AgentProjectInfo> => {
                const projectPath = join(projectsRootPath, projectDirectoryEntry.name);
                const [projectUsage, isGitRepository] = await Promise.all([
                    measureDirectoryUsage(projectPath),
                    isGitRepositoryDirectory(projectPath),
                ]);

                return {
                    projectName: projectDirectoryEntry.name,
                    relativePath: `${AGENT_PROJECTS_DIRECTORY_PATH}/${projectDirectoryEntry.name}`,
                    absolutePath: projectPath,
                    sizeBytes: projectUsage.sizeBytes,
                    fileCount: projectUsage.fileCount,
                    isGitRepository,
                    latestModifiedAt:
                        projectUsage.latestModifiedAtMs === null
                            ? null
                            : new Date(projectUsage.latestModifiedAtMs).toISOString(),
                };
            }),
    );

    return projects.sort((firstProject, secondProject) =>
        firstProject.projectName.localeCompare(secondProject.projectName),
    );
}

/**
 * Returns true when the directory contains a `.git` directory and therefore is a git repository.
 */
async function isGitRepositoryDirectory(directoryPath: string): Promise<boolean> {
    try {
        const gitStats = await stat(join(directoryPath, '.git'));
        return gitStats.isDirectory();
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }

        throw error;
    }
}
