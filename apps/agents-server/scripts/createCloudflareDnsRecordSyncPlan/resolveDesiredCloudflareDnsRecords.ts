import { findBestMatchingCloudflareZoneForDomain } from '../../src/utils/cloudflare/findBestMatchingCloudflareZoneForDomain';
import { getVercelDomainConfiguration, type VercelApiConfiguration } from '../createVercelDomainSyncPlan';
import type {
    CloudflareSkippedDomain,
    CloudflareZone,
    DesiredCloudflareDnsRecord,
} from './CloudflareDnsRecordSyncPlan';
import { resolveDesiredCloudflareDnsRecord } from './resolveDesiredCloudflareDnsRecord';

/**
 * Resolves desired Cloudflare DNS records from Vercel domain recommendations.
 *
 * @param options - Cloudflare and Vercel domain metadata.
 * @returns Desired records plus domains that were skipped before record diffing.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function resolveDesiredCloudflareDnsRecords(options: {
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly domains: ReadonlyArray<string>;
    readonly zones: ReadonlyArray<CloudflareZone>;
}): Promise<{
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains: ReadonlyArray<CloudflareSkippedDomain>;
}> {
    const desiredRecords: Array<DesiredCloudflareDnsRecord> = [];
    const skippedDomains: Array<CloudflareSkippedDomain> = [];

    for (const domain of options.domains) {
        const zone = findBestMatchingCloudflareZoneForDomain(domain, options.zones);
        if (!zone) {
            skippedDomains.push({
                domain,
                reason: 'No matching Cloudflare zone was found for this managed domain.',
            });
            continue;
        }

        const domainConfiguration = await getVercelDomainConfiguration(options.vercelConfiguration, domain);
        desiredRecords.push(resolveDesiredCloudflareDnsRecord(domain, zone, domainConfiguration));
    }

    return {
        desiredRecords,
        skippedDomains,
    };
}
