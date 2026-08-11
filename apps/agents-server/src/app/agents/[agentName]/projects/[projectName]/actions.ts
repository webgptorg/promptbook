'use server';

import {
    $startAgentProjectRuntimeAction,
    $stopAgentProjectRuntimeAction,
} from '../../projectRuntimeActions';

/**
 * Starts one project from its project page.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 */
export async function $startAgentProjectRuntimeFromProjectPageAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    await $startAgentProjectRuntimeAction(agentPermanentId, projectName);
}

/**
 * Terminates the runtime assigned to one project from its project page.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 */
export async function $terminateAgentProjectRuntimeFromProjectPageAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    await $stopAgentProjectRuntimeAction(agentPermanentId, projectName);
}
