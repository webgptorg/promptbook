import { isManagedCloudflareDnsRecord } from './CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
import type { CloudflareDnsRecord, DesiredCloudflareDnsRecord } from './CloudflareDnsRecordSyncPlan';
import { normalizeCloudflareDnsRecordContent } from './normalizeCloudflareDnsRecordContent';

/**
 * Picks the Cloudflare record that should represent the managed hostname.
 *
 * @param existingRecords - Current Cloudflare records for the exact name.
 * @param desiredRecord - Desired Cloudflare DNS record.
 * @returns Selected record or `null` when the situation is ambiguous.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function selectCloudflareRecordForManagedDomain(
    existingRecords: ReadonlyArray<CloudflareDnsRecord>,
    desiredRecord: DesiredCloudflareDnsRecord,
): CloudflareDnsRecord | null {
    const matchingTypeRecords = existingRecords.filter((existingRecord) => existingRecord.type === desiredRecord.type);
    if (matchingTypeRecords.length === 0) {
        return null;
    }

    const managedRecords = matchingTypeRecords.filter(isManagedCloudflareDnsRecord);
    if (managedRecords.length === 1) {
        return managedRecords[0] || null;
    }
    if (managedRecords.length > 1) {
        return null;
    }

    const exactContentMatches = matchingTypeRecords.filter(
        (existingRecord) =>
            normalizeCloudflareDnsRecordContent(existingRecord.type, existingRecord.content) === desiredRecord.content,
    );
    if (exactContentMatches.length === 1) {
        return exactContentMatches[0] || null;
    }
    if (matchingTypeRecords.length === 1) {
        return matchingTypeRecords[0] || null;
    }

    return null;
}
