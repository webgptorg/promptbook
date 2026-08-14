'use server';

import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import type { AgentProjectReferenceInfo } from '@/src/utils/agentProjects/AgentProjectReferenceInfo';
import { listAgentProjectNames } from '@/src/utils/agentProjects/listAgentProjectNames';
import { resolveAgentChatProjectReferences } from '@/src/utils/agentProjects/resolveAgentChatProjectReferences';

/**
 * Reloads the project references of one open chat when the agent's set of projects changed.
 *
 * A chat renders every mention of a project as a project chip built from these references, so a project
 * created while the chat stays open must reach the browser without a page reload. Building the references
 * walks every project folder, therefore the project names the chat already knows decide whether that work
 * is done at all.
 *
 * @param agentPermanentId - Permanent id of the agent owning the projects.
 * @param knownProjectNames - Project directory names the open chat already renders.
 * @returns Fresh project references, or `null` when the agent owns exactly the known projects.
 */
export async function $refreshAgentProjectChatReferencesAction(
    agentPermanentId: string,
    knownProjectNames: ReadonlyArray<string>,
): Promise<ReadonlyArray<AgentProjectReferenceInfo> | null> {
    const projectsAccess = await resolveAgentProjectsAccess(agentPermanentId);

    if (!projectsAccess.isProjectOverviewVisible) {
        return [];
    }

    const projectNames = await listAgentProjectNames(agentPermanentId);

    if (areAgentProjectNamesEqual(projectNames, knownProjectNames)) {
        return null;
    }

    return await resolveAgentChatProjectReferences({ agentPermanentId, projectsAccess });
}

/**
 * Compares two collections of project directory names ignoring their order and letter case.
 *
 * @param firstProjectNames - Project names listed on the server.
 * @param secondProjectNames - Project names reported by the open chat.
 * @returns Whether both collections describe the same projects.
 */
function areAgentProjectNamesEqual(
    firstProjectNames: ReadonlyArray<string>,
    secondProjectNames: ReadonlyArray<string>,
): boolean {
    if (firstProjectNames.length !== secondProjectNames.length) {
        return false;
    }

    const normalizedSecondProjectNames = new Set(
        secondProjectNames.map((secondProjectName) => secondProjectName.toLowerCase()),
    );

    return firstProjectNames.every((firstProjectName) =>
        normalizedSecondProjectNames.has(firstProjectName.toLowerCase()),
    );
}
