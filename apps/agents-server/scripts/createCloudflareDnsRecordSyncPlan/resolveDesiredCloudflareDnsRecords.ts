import { getVercelDomainConfiguration, type VercelApiConfiguration } from '../createVercelDomainSyncPlan';
import { normalizeManagedDomain } from '../normalizeManagedDomain';
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

/**
 * Finds the best matching Cloudflare zone for one fully-qualified domain.
 *
 * @param domain - Fully-qualified managed domain.
 * @param zones - Accessible Cloudflare zones.
 * @returns Best matching zone or `null`.
 */
function findBestMatchingCloudflareZoneForDomain(
    domain: string,
    zones: ReadonlyArray<CloudflareZone>,
): CloudflareZone | null {
    const normalizedDomain = normalizeManagedDomain(domain);
    let bestMatch: CloudflareZone | null = null;

    for (const zone of zones) {
        const normalizedZoneName = normalizeManagedDomain(zone.name);
        if (normalizedDomain !== normalizedZoneName && !normalizedDomain.endsWith(`.${normalizedZoneName}`)) {
            continue;
        }

        if (!bestMatch || normalizedZoneName.length > normalizeManagedDomain(bestMatch.name).length) {
            bestMatch = zone;
        }
    }

    return bestMatch;
}
