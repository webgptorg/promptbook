import type { DesiredVercelProjectDomain, VercelApiConfiguration, VercelProjectDomain } from './VercelDomainSyncPlan';
import { requestVercel } from './requestVercel';

/**
 * Adds one missing domain to the Vercel project.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to attach to the project.
 * @returns Created/attached Vercel project domain.
 *
 * @private function of `sync-vercel-domains`
 */
export async function addProjectDomain(
    configuration: VercelApiConfiguration,
    domain: DesiredVercelProjectDomain,
): Promise<VercelProjectDomain> {
    const body: Record<string, unknown> = { name: domain.name };

    if (domain.gitBranch) {
        body.gitBranch = domain.gitBranch;
    }
    if (domain.customEnvironmentId) {
        body.customEnvironmentId = domain.customEnvironmentId;
    }

    return requestVercel<VercelProjectDomain>({
        configuration,
        method: 'POST',
        pathname: `/v10/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains`,
        body,
    });
}
