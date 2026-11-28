import { listAgentProjectDomainRecords, resolveAgentProjectRuntimeBaseDomain } from './agentProjectRuntimeDomains';
import { resolveCurrentAgentProjectServerDomain } from './resolveCurrentAgentProjectServerDomain';

/**
 * Resolves the stable public URLs of the projects of one agent.
 *
 * The public URL of one project comes from its persisted domain assignment, so it stays the same
 * whether the project runtime is running or stopped.
 *
 * @param agentPermanentId - Permanent id of the agent owning the projects.
 * @returns Public project URLs keyed by lowercase project name.
 */
export async function resolveAgentProjectPublicUrls(agentPermanentId: string): Promise<ReadonlyMap<string, string>> {
    const [projectDomainRecords, currentServerDomain] = await Promise.all([
        listAgentProjectDomainRecords(),
        resolveCurrentAgentProjectServerDomain(),
    ]);
    const serverDomain = resolveAgentProjectRuntimeBaseDomain(currentServerDomain);
    const publicUrlByProjectName = new Map<string, string>();

    for (const projectDomainRecord of projectDomainRecords) {
        if (projectDomainRecord.agentPermanentId.toLowerCase() !== agentPermanentId.toLowerCase()) {
            continue;
        }

        if (serverDomain && resolveAgentProjectRuntimeBaseDomain(projectDomainRecord.serverDomain) !== serverDomain) {
            continue;
        }

        publicUrlByProjectName.set(projectDomainRecord.projectName.toLowerCase(), projectDomainRecord.publicUrl);
    }

    return publicUrlByProjectName;
}
