'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../../../src/utils/organization/spaceTrim';
import { resolveAgentProjectsAccess } from '@/src/utils/agentProjects/agentProjectAccess';
import { buildAgentProjectProfileHref } from '@/src/utils/agentProjects/agentProjectHrefs';
import { terminateAgentProjectRuntimeForProject } from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';

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
    const access = await resolveAgentProjectsAccess(agentPermanentId);

    if (!access.isProjectDetailsVisible) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to terminate project \`${projectName}\`.
            `),
        );
    }

    await terminateAgentProjectRuntimeForProject({ agentPermanentId, projectName });
    revalidatePath(buildAgentProjectProfileHref(agentPermanentId, projectName));
    revalidatePath('/admin/resource-monitor');
}
