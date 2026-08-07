import { stat } from 'fs/promises';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import type { AgentProjectInfo } from './AgentProjectInfo';
import { resolveAgentProjectsRootPath, resolveSafeAgentProjectPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { measureDirectoryUsage } from './measureDirectoryUsage';
import { readAgentProjectIndexHtmlProfile } from './readAgentProjectIndexHtmlProfile';
import { readAgentProjectReadme } from './readAgentProjectReadme';
import { resolveAgentProjectFaviconRelativePath } from './resolveAgentProjectFaviconRelativePath';
import { resolveAgentProjectProfile } from './resolveAgentProjectProfile';

/**
 * Builds metadata for one project directory.
 *
 * @param projectsRootPath - Absolute path of the owning agent's `projects/` folder.
 * @param projectDirectoryName - Direct child directory name inside `projects/`.
 * @returns Project metadata.
 */
export async function createAgentProjectInfo(
    projectsRootPath: string,
    projectDirectoryName: string,
): Promise<AgentProjectInfo> {
    const projectPath = join(projectsRootPath, projectDirectoryName);
    const [projectUsage, isGitRepository, readme, indexHtmlProfile] = await Promise.all([
        measureDirectoryUsage(projectPath),
        isGitRepositoryDirectory(projectPath),
        readAgentProjectReadme(projectPath),
        readAgentProjectIndexHtmlProfile(projectPath),
    ]);
    const profile = resolveAgentProjectProfile({
        projectDirectoryName,
        readme,
        indexHtmlTitle: indexHtmlProfile?.title ?? null,
    });
    const faviconRelativePath = await resolveAgentProjectFaviconRelativePath({
        projectPath,
        indexHtmlFaviconHref: indexHtmlProfile?.faviconHref ?? null,
    });

    return {
        projectName: projectDirectoryName,
        displayName: profile.displayName,
        description: profile.description,
        readmeFileName: profile.readmeFileName,
        faviconRelativePath,
        relativePath: `${AGENT_PROJECTS_DIRECTORY_PATH}/${projectDirectoryName}`,
        absolutePath: projectPath,
        sizeBytes: projectUsage.sizeBytes,
        fileCount: projectUsage.fileCount,
        isGitRepository,
        latestModifiedAt:
            projectUsage.latestModifiedAtMs === null ? null : new Date(projectUsage.latestModifiedAtMs).toISOString(),
    };
}

/**
 * Resolves metadata for one project of one agent.
 *
 * @param agentPermanentId - Permanent id of the owning agent.
 * @param projectName - Project directory name.
 * @returns Project metadata or `null` when the project does not exist.
 */
export async function resolveAgentProjectInfo(
    agentPermanentId: string,
    projectName: string,
): Promise<AgentProjectInfo | null> {
    const projectPath = resolveSafeAgentProjectPath({ agentPermanentId, projectName });

    try {
        const projectStats = await stat(projectPath);
        if (!projectStats.isDirectory()) {
            return null;
        }
    } catch (error) {
        if (isMissingPathError(error)) {
            return null;
        }

        throw error;
    }

    return createAgentProjectInfo(resolveAgentProjectsRootPath(agentPermanentId), projectName);
}

/**
 * Returns true when the directory contains a `.git` directory and therefore is a git repository.
 *
 * @param directoryPath - Project directory path.
 * @returns `true` when the project is a git repository.
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
