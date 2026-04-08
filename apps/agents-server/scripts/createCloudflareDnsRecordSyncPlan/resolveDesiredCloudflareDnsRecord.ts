import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import type { VercelDomainConfiguration } from '../createVercelDomainSyncPlan';
import { normalizeManagedDomain } from '../normalizeManagedDomain';
import {
    createCloudflareManagedRecordComment,
    mergeCloudflareDnsRecordTags,
} from './CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
import {
    CLOUDFLARE_DNS_RECORD_PROXIED,
    CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
    type CloudflareZone,
    type DesiredCloudflareDnsRecord,
} from './CloudflareDnsRecordSyncPlan';
import { normalizeCloudflareDnsRecordContent } from './normalizeCloudflareDnsRecordContent';

/**
 * Resolves the desired Cloudflare DNS record for one managed domain.
 *
 * @param domain - Managed domain.
 * @param zone - Matching Cloudflare zone.
 * @param domainConfiguration - Vercel DNS recommendations.
 * @returns Desired Cloudflare DNS record.
 *
 * @private function of `sync-vercel-domains`
 */
export function resolveDesiredCloudflareDnsRecord(
    domain: string,
    zone: Pick<CloudflareZone, 'id' | 'name'>,
    domainConfiguration: VercelDomainConfiguration,
): DesiredCloudflareDnsRecord {
    const normalizedDomain = normalizeManagedDomain(domain);
    const normalizedZoneName = normalizeManagedDomain(zone.name);
    const preferredComment = createCloudflareManagedRecordComment(null);
    const preferredTags = mergeCloudflareDnsRecordTags([]);

    if (normalizedDomain === normalizedZoneName) {
        const preferredIpv4 = extractPreferredRecommendedIpv4(domainConfiguration.recommendedIPv4);
        if (!preferredIpv4) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to resolve a recommended IPv4 for apex domain \`${normalizedDomain}\` from Vercel.
                `),
            );
        }

        return {
            zoneId: zone.id,
            zoneName: normalizedZoneName,
            name: normalizedDomain,
            type: 'A',
            content: preferredIpv4,
            proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
            ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
            comment: preferredComment,
            tags: preferredTags,
        };
    }

    const preferredCname = extractPreferredRecommendedCname(domainConfiguration.recommendedCNAME);
    if (!preferredCname) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to resolve a recommended CNAME for subdomain \`${normalizedDomain}\` from Vercel.
            `),
        );
    }

    return {
        zoneId: zone.id,
        zoneName: normalizedZoneName,
        name: normalizedDomain,
        type: 'CNAME',
        content: preferredCname,
        proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
        ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
        comment: preferredComment,
        tags: preferredTags,
    };
}

/**
 * Extracts the preferred Vercel-recommended IPv4 value.
 *
 * @param recommendedIpv4 - Ranked recommended IPv4 values.
 * @returns Preferred IPv4 or `null`.
 */
function extractPreferredRecommendedIpv4(
    recommendedIpv4: ReadonlyArray<{
        readonly rank: number;
        readonly value: ReadonlyArray<string>;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedIpv4].sort((left, right) => left.rank - right.rank)[0];
    const preferredValue = preferredRecommendation?.value[0];
    return preferredValue ? preferredValue.trim() : null;
}

/**
 * Extracts the preferred Vercel-recommended CNAME target.
 *
 * @param recommendedCname - Ranked recommended CNAME targets.
 * @returns Preferred CNAME target or `null`.
 */
function extractPreferredRecommendedCname(
    recommendedCname: ReadonlyArray<{
        readonly rank: number;
        readonly value: string;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedCname].sort((left, right) => left.rank - right.rank)[0];
    return preferredRecommendation ? normalizeCloudflareDnsRecordContent('CNAME', preferredRecommendation.value) : null;
}
