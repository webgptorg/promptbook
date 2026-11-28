import { normalizeDomainForMatching } from '../../../../../src/utils/validators/url/normalizeDomainForMatching';
import type { CloudflareZone } from './CloudflareApi';

/**
 * Finds the best matching Cloudflare zone for one fully-qualified domain.
 *
 * The longest matching zone wins, so `sub.example.com` prefers a dedicated `sub.example.com` zone over `example.com`.
 *
 * @param domain - Fully-qualified domain.
 * @param zones - Accessible Cloudflare zones.
 * @returns Best matching zone or `null`.
 */
export function findBestMatchingCloudflareZoneForDomain(
    domain: string,
    zones: ReadonlyArray<CloudflareZone>,
): CloudflareZone | null {
    const normalizedDomain = normalizeDomainForMatching(domain);
    if (!normalizedDomain) {
        return null;
    }

    let bestMatch: CloudflareZone | null = null;
    let bestMatchZoneNameLength = 0;

    for (const zone of zones) {
        const normalizedZoneName = normalizeDomainForMatching(zone.name);
        if (!normalizedZoneName) {
            continue;
        }
        if (normalizedDomain !== normalizedZoneName && !normalizedDomain.endsWith(`.${normalizedZoneName}`)) {
            continue;
        }

        if (!bestMatch || normalizedZoneName.length > bestMatchZoneNameLength) {
            bestMatch = zone;
            bestMatchZoneNameLength = normalizedZoneName.length;
        }
    }

    return bestMatch;
}
