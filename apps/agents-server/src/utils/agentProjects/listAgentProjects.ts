import { readdir } from 'fs/promises';
import type { AgentProjectInfo } from './AgentProjectInfo';
import { resolveAgentProjectsRootPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { createAgentProjectInfo } from './resolveAgentProjectInfo';

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
            .map((projectDirectoryEntry): Promise<AgentProjectInfo> =>
                createAgentProjectInfo(projectsRootPath, projectDirectoryEntry.name),
            ),
    );

    return projects.sort((firstProject, secondProject) =>
        firstProject.projectName.localeCompare(secondProject.projectName),
    );
}
