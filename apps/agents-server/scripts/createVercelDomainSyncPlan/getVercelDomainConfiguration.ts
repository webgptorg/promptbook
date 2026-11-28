import type { VercelApiConfiguration, VercelDomainConfiguration } from './VercelDomainSyncPlan';
import { requestVercel } from './requestVercel';

/**
 * Gets Vercel DNS recommendations for one domain.
 *
 * @param configuration - Vercel API configuration.
 * @param domain - Managed domain name.
 * @returns Vercel domain DNS recommendations.
 *
 * @private function of `sync-vercel-domains`
 */
export async function getVercelDomainConfiguration(
    configuration: VercelApiConfiguration,
    domain: string,
): Promise<VercelDomainConfiguration> {
    const searchParams = new URLSearchParams();
    searchParams.set('projectIdOrName', configuration.projectIdOrName);

    return requestVercel<VercelDomainConfiguration>({
        configuration,
        method: 'GET',
        pathname: `/v6/domains/${encodeURIComponent(domain)}/config`,
        searchParams,
    });
}
