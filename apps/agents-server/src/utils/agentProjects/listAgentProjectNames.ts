import { readdir } from 'fs/promises';
import { resolveAgentProjectsRootPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';

/**
 * Lists the directory names of all projects of one agent.
 *
 * This is the cheap half of `listAgentProjects` — it reads the `projects/` folder itself and never walks
 * the project trees, so it can answer "did the set of projects change?" without measuring every project.
 *
 * A missing projects folder is reported as an empty list — the folder is created lazily
 * when the agent (or the runner) first needs it.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Project directory names ordered by name.
 */
export async function listAgentProjectNames(agentPermanentId: string): Promise<ReadonlyArray<string>> {
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

    return projectsRootEntries
        .filter((projectsRootEntry) => projectsRootEntry.isDirectory())
        .map((projectDirectoryEntry) => projectDirectoryEntry.name)
        .sort((firstProjectName, secondProjectName) => firstProjectName.localeCompare(secondProjectName));
}
