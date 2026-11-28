import type { VercelApiConfiguration } from './VercelDomainSyncPlan';
import { requestVercel } from './requestVercel';

/**
 * Removes one stale domain from the Vercel project.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to remove.
 *
 * @private function of `sync-vercel-domains`
 */
export async function removeProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
    await requestVercel({
        configuration,
        method: 'DELETE',
        pathname: `/v9/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains/${encodeURIComponent(
            domain,
        )}`,
    });
}
