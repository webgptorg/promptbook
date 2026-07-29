'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../src/errors/NotFoundError';
import { UnexpectedError } from '../../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { buildAgentProjectProfileHref } from '../../../utils/agentProjects/agentProjectHrefs';
import { setAgentProjectCustomDomain } from '../../../utils/agentProjects/agentProjectRuntimeDomains';
import {
    refreshAgentProjectRuntimePublicDomain,
    startAgentProjectRuntime,
    terminateAgentProjectRuntimeForProject,
} from '../../../utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveCurrentAgentProjectServerDomain } from '../../../utils/agentProjects/resolveCurrentAgentProjectServerDomain';
import { resolveAgentProjectInfo } from '../../../utils/agentProjects/resolveAgentProjectInfo';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { applyVpsRuntimeConfiguration } from '../../../utils/vpsConfiguration';
import { AGENT_PROJECT_CUSTOM_DOMAIN_FORM_FIELD } from './agentProjectCustomDomainForm';

/**
 * Starts one project from the admin projects dashboard.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Directory name of the project.
 */
export async function $startAgentProjectRuntimeFromAdminProjectsAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    if (!(await isUserAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to start projects from the admin projects dashboard.
            `),
        );
    }

    await startAgentProjectRuntime({
        agentPermanentId,
        projectName,
        serverDomain: await resolveCurrentAgentProjectServerDomain(),
    });
    revalidateAgentProjectRuntimeViews(agentPermanentId, projectName);
}

/**
 * Stops one project from the admin projects dashboard.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Directory name of the project.
 */
export async function $terminateAgentProjectRuntimeFromAdminProjectsAction(
    agentPermanentId: string,
    projectName: string,
): Promise<void> {
    if (!(await isUserAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to stop projects from the admin projects dashboard.
            `),
        );
    }

    await terminateAgentProjectRuntimeForProject({ agentPermanentId, projectName });
    revalidateAgentProjectRuntimeViews(agentPermanentId, projectName);
}

/**
 * Saves or clears a custom domain assignment for one agent project from `/admin/projects`.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Directory name of the project.
 * @param formData - Submitted domain form data.
 */
export async function $setAgentProjectCustomDomainFromAdminProjectsAction(
    agentPermanentId: string,
    projectName: string,
    formData: FormData,
): Promise<void> {
    if (!(await isUserAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to assign custom project domains.
            `),
        );
    }

    const project = await resolveAgentProjectInfo(agentPermanentId, projectName);
    if (!project) {
        throw new NotFoundError(
            spaceTrim(`
                Project \`${projectName}\` was not found for agent \`${agentPermanentId}\`.
            `),
        );
    }

    const serverDomain = await resolveCurrentAgentProjectServerDomain();
    const customDomain = String(formData.get(AGENT_PROJECT_CUSTOM_DOMAIN_FORM_FIELD) || '').trim();
    const domainAssignment = await setAgentProjectCustomDomain({
        agentPermanentId,
        projectName: project.projectName,
        serverDomain,
        customDomain: customDomain || null,
    });

    if (domainAssignment.isChanged) {
        await applyAgentProjectCustomDomainRuntimeConfiguration({
            agentPermanentId,
            projectName: project.projectName,
            serverDomain,
        });
    }

    await refreshAgentProjectRuntimePublicDomain({
        agentPermanentId,
        projectName: project.projectName,
        serverDomain,
    });
    revalidatePath('/admin/projects');
    revalidatePath('/superadmin/servers');
    revalidatePath('/superadmin/resource-monitor');
    revalidatePath(buildAgentProjectProfileHref(agentPermanentId, project.projectName));
}

/**
 * Applies nginx/certbot configuration after the project-domain registry changed.
 */
async function applyAgentProjectCustomDomainRuntimeConfiguration(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly serverDomain: string | null;
}): Promise<void> {
    try {
        await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to apply custom project domain configuration.

                **Agent:** \`${options.agentPermanentId}\`
                **Project:** \`${options.projectName}\`
                **Server domain:** \`${options.serverDomain || 'unknown'}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Revalidates views that display one project runtime.
 */
function revalidateAgentProjectRuntimeViews(agentPermanentId: string, projectName: string): void {
    revalidatePath('/admin/projects');
    revalidatePath(buildAgentProjectProfileHref(agentPermanentId, projectName));
    revalidatePath('/superadmin/resource-monitor');
    revalidatePath('/superadmin/servers');
}
