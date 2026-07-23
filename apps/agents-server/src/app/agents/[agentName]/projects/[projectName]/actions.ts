'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../../../src/utils/organization/spaceTrim';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { buildAgentProjectProfileHref } from '@/src/utils/agentProjects/agentProjectHrefs';
import {
    startAgentProjectDevRuntime,
    startAgentProjectStaticRuntime,
    terminateAgentProjectRuntimeForProject,
} from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveCurrentAgentProjectServerDomain } from '@/src/utils/agentProjects/resolveCurrentAgentProjectServerDomain';

/**
 * Starts the default dev runtime for one project from its project page.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 */
export async function $startAgentProjectDevRuntimeFromProjectPageAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    await assertProjectRuntimeActionAccess(agentPermanentId, projectName, 'start');

    await startAgentProjectDevRuntime({
        agentPermanentId,
        projectName,
        serverDomain: await resolveCurrentAgentProjectServerDomain(),
    });
    revalidateProjectRuntimePaths(agentPermanentId, projectName);
}

/**
 * Starts the static runtime for one project from its project page.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 */
export async function $startAgentProjectStaticRuntimeFromProjectPageAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    await assertProjectRuntimeActionAccess(agentPermanentId, projectName, 'start');

    await startAgentProjectStaticRuntime({
        agentPermanentId,
        projectName,
        serverDomain: await resolveCurrentAgentProjectServerDomain(),
    });
    revalidateProjectRuntimePaths(agentPermanentId, projectName);
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
    await assertProjectRuntimeActionAccess(agentPermanentId, projectName, 'terminate');

    await terminateAgentProjectRuntimeForProject({ agentPermanentId, projectName });
    revalidateProjectRuntimePaths(agentPermanentId, projectName);
}

/**
 * Checks that the current user can perform a project runtime action.
 */
async function assertProjectRuntimeActionAccess(
    agentPermanentId: string,
    projectName: string,
    actionName: 'start' | 'terminate',
): Promise<void> {
    const access = await resolveAgentProjectsAccess(agentPermanentId);

    if (!access.isProjectDetailsVisible) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to ${actionName} project \`${projectName}\`.
            `),
        );
    }
}

/**
 * Revalidates pages that show project runtime state.
 */
function revalidateProjectRuntimePaths(agentPermanentId: string, projectName: string): void {
    revalidatePath(buildAgentProjectProfileHref(agentPermanentId, projectName));
    revalidatePath('/admin/resource-monitor');
    revalidatePath('/admin/servers');
}
