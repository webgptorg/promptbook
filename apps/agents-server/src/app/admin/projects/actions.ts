'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../../src/errors/NotFoundError';
import { UnexpectedError } from '../../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { buildAgentProjectProfileHref } from '../../../utils/agentProjects/agentProjectHrefs';
import { setAgentProjectCustomDomain } from '../../../utils/agentProjects/agentProjectRuntimeDomains';
import { refreshAgentProjectRuntimePublicDomain } from '../../../utils/agentProjects/agentProjectRuntimeRegistry';
import { resolveCurrentAgentProjectServerDomain } from '../../../utils/agentProjects/resolveCurrentAgentProjectServerDomain';
import { resolveAgentProjectInfo } from '../../../utils/agentProjects/resolveAgentProjectInfo';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { applyVpsRuntimeConfiguration } from '../../../utils/vpsConfiguration';
import { AGENT_PROJECT_CUSTOM_DOMAIN_FORM_FIELD } from './agentProjectCustomDomainForm';

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
    revalidatePath('/admin/servers');
    revalidatePath('/admin/resource-monitor');
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
