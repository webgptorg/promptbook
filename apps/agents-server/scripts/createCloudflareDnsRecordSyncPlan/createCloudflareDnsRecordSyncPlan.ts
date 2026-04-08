import { normalizeManagedDomain } from '../normalizeManagedDomain';
import type {
    CloudflareApiConfiguration,
    CloudflareDnsRecord,
    CloudflareDnsRecordSyncPlan,
    CloudflareDnsRecordUpdate,
    CloudflareSkippedDomain,
    DesiredCloudflareDnsRecord,
} from './CloudflareDnsRecordSyncPlan';
import { describeCloudflareDnsRecordUpdateReasons } from './describeCloudflareDnsRecordUpdateReasons';
import { listAllCloudflareDnsRecords } from './listAllCloudflareDnsRecords';
import { selectCloudflareRecordForManagedDomain } from './selectCloudflareRecordForManagedDomain';

/**
 * Creates a diff between desired Cloudflare DNS records and current records.
 *
 * @param options - Desired records and access to Cloudflare.
 * @returns Cloudflare DNS sync plan.
 *
 * @private function of `sync-vercel-domains`
 */
export async function createCloudflareDnsRecordSyncPlan(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains?: ReadonlyArray<CloudflareSkippedDomain>;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const recordsToCreate: Array<DesiredCloudflareDnsRecord> = [];
    const recordsToUpdate: Array<CloudflareDnsRecordUpdate> = [];
    const skippedDomains = [...(options.skippedDomains || [])];
    const zoneRecordsCache = new Map<string, ReadonlyArray<CloudflareDnsRecord>>();

    for (const desiredRecord of options.desiredRecords) {
        const existingZoneRecords =
            zoneRecordsCache.get(desiredRecord.zoneId) ||
            (await listAllCloudflareDnsRecords(options.cloudflareConfiguration, desiredRecord.zoneId));
        zoneRecordsCache.set(desiredRecord.zoneId, existingZoneRecords);

        const existingRecords = existingZoneRecords.filter(
            (existingRecord) => normalizeManagedDomain(existingRecord.name) === desiredRecord.name,
        );
        const selectedExistingRecord = selectCloudflareRecordForManagedDomain(existingRecords, desiredRecord);

        if (!selectedExistingRecord) {
            if (existingRecords.length > 0) {
                skippedDomains.push({
                    domain: desiredRecord.name,
                    reason: 'Cloudflare already contains conflicting or ambiguous records on this hostname, so no automatic create/update was attempted.',
                });
                continue;
            }

            recordsToCreate.push(desiredRecord);
            continue;
        }

        const updateReasons = describeCloudflareDnsRecordUpdateReasons(selectedExistingRecord, desiredRecord);
        if (updateReasons.length > 0) {
            recordsToUpdate.push({
                currentRecord: selectedExistingRecord,
                desiredRecord,
                reasons: updateReasons,
            });
        }
    }

    return {
        recordsToCreate,
        recordsToUpdate,
        skippedDomains,
    };
}
