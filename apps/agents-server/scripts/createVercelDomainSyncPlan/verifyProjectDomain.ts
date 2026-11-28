import type { VercelApiConfiguration } from './VercelDomainSyncPlan';
import { requestVercel } from './requestVercel';

/**
 * Requests Vercel verification for one project domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Domain to verify.
 *
 * @private function of `sync-vercel-domains`
 */
export async function verifyProjectDomain(configuration: VercelApiConfiguration, domain: string): Promise<void> {
    await requestVercel({
        configuration,
        method: 'POST',
        pathname: `/v9/projects/${encodeURIComponent(configuration.projectIdOrName)}/domains/${encodeURIComponent(
            domain,
        )}/verify`,
    });
}
