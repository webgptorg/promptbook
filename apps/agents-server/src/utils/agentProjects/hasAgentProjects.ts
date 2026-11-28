import { readdir } from 'fs/promises';
import { resolveAgentProjectsRootPath } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';

/**
 * Returns whether one agent has at least one local project directory.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns `true` when the agent has at least one project directory.
 */
export async function hasAgentProjects(agentPermanentId: string): Promise<boolean> {
    const projectsRootPath = resolveAgentProjectsRootPath(agentPermanentId);

    try {
        const projectsRootEntries = await readdir(projectsRootPath, { withFileTypes: true });
        return projectsRootEntries.some((projectsRootEntry) => projectsRootEntry.isDirectory());
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }

        throw error;
    }
}
