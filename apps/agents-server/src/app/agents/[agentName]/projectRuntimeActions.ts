'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { buildAgentProjectProfileHref } from '@/src/utils/agentProjects/agentProjectHrefs';
import type { AgentProjectRuntimeActionResult } from '@/src/utils/agentProjects/AgentProjectRuntimeActionResult';
import {
    startAgentProjectRuntime,
    terminateAgentProjectRuntimeForProject,
} from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveCurrentAgentProjectServerDomain } from '@/src/utils/agentProjects/resolveCurrentAgentProjectServerDomain';

/**
 * Starts one project after checking the current user's access.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Browser-safe state of the started runtime.
 */
export async function $startAgentProjectRuntimeAction(
    agentPermanentId: string,
    projectName: string,
): Promise<AgentProjectRuntimeActionResult> {
    await assertProjectRuntimeActionAccess(agentPermanentId, projectName, 'start');

    const runtime = await startAgentProjectRuntime({
        agentPermanentId,
        projectName,
        serverDomain: await resolveCurrentAgentProjectServerDomain(),
    });
    revalidateProjectRuntimePaths(agentPermanentId, projectName);

    return {
        isRunning: runtime.isRunning,
        projectUrl: runtime.publicUrl || null,
    };
}

/**
 * Stops one project after checking the current user's access.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Browser-safe state of the stopped runtime.
 */
export async function $stopAgentProjectRuntimeAction(
    agentPermanentId: string,
    projectName: string,
): Promise<AgentProjectRuntimeActionResult> {
    await assertProjectRuntimeActionAccess(agentPermanentId, projectName, 'stop');

    const runtime = await terminateAgentProjectRuntimeForProject({ agentPermanentId, projectName });
    revalidateProjectRuntimePaths(agentPermanentId, projectName);

    return {
        isRunning: false,
        projectUrl: runtime?.publicUrl || null,
    };
}

/**
 * Checks that the current user can perform a project runtime action.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @param actionName - Human-readable action used in an access error.
 */
async function assertProjectRuntimeActionAccess(
    agentPermanentId: string,
    projectName: string,
    actionName: 'start' | 'stop',
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
 * Revalidates pages which show project runtime state.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 */
function revalidateProjectRuntimePaths(agentPermanentId: string, projectName: string): void {
    revalidatePath(buildAgentProjectProfileHref(agentPermanentId, projectName));
    revalidatePath('/admin/projects');
    revalidatePath('/superadmin/resource-monitor');
    revalidatePath('/superadmin/servers');
}
