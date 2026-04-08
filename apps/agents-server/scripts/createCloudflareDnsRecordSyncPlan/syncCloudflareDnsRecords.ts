import type { VercelApiConfiguration } from '../createVercelDomainSyncPlan';
import { logSyncEvent } from '../logSyncEvent';
import type {
    CloudflareApiConfiguration,
    CloudflareDnsRecordSyncPlan,
    CloudflareDnsRecordUpdate,
    CloudflareSkippedDomain,
    DesiredCloudflareDnsRecord,
} from './CloudflareDnsRecordSyncPlan';
import { createCloudflareDnsRecord } from './createCloudflareDnsRecord';
import { createCloudflareDnsRecordSyncPlan } from './createCloudflareDnsRecordSyncPlan';
import { listCloudflareZones } from './listCloudflareZones';
import { resolveDesiredCloudflareDnsRecords } from './resolveDesiredCloudflareDnsRecords';
import { updateCloudflareDnsRecord } from './updateCloudflareDnsRecord';

/**
 * Syncs Cloudflare DNS records for the desired managed domains.
 *
 * Note: This intentionally never deletes Cloudflare records, because one zone can contain subdomains for unrelated projects.
 *
 * @param options - Cloudflare and Vercel sync options.
 * @returns Planned or applied Cloudflare DNS changes.
 *
 * @private function of `sync-vercel-domains`
 */
export async function syncCloudflareDnsRecords(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly desiredDomains: ReadonlyArray<string>;
    readonly dryRun: boolean;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const zones = await listCloudflareZones(options.cloudflareConfiguration);
    logSyncEvent('info', 'cloudflare_zones_loaded', {
        count: zones.length,
        dryRun: options.dryRun,
    });

    const desiredRecordsResolution = await resolveDesiredCloudflareDnsRecords({
        vercelConfiguration: options.vercelConfiguration,
        domains: options.desiredDomains,
        zones,
    });
    const cloudflareSyncPlan = await createCloudflareDnsRecordSyncPlan({
        cloudflareConfiguration: options.cloudflareConfiguration,
        desiredRecords: desiredRecordsResolution.desiredRecords,
        skippedDomains: desiredRecordsResolution.skippedDomains,
    });

    logSyncEvent('info', 'cloudflare_sync_planned', {
        createCount: cloudflareSyncPlan.recordsToCreate.length,
        updateCount: cloudflareSyncPlan.recordsToUpdate.length,
        skippedCount: cloudflareSyncPlan.skippedDomains.length,
        dryRun: options.dryRun,
    });

    logCloudflareSkippedDomains(cloudflareSyncPlan.skippedDomains, options.dryRun);
    await syncCloudflareDnsRecordCreations({
        cloudflareConfiguration: options.cloudflareConfiguration,
        recordsToCreate: cloudflareSyncPlan.recordsToCreate,
        dryRun: options.dryRun,
    });
    await syncCloudflareDnsRecordUpdates({
        cloudflareConfiguration: options.cloudflareConfiguration,
        recordsToUpdate: cloudflareSyncPlan.recordsToUpdate,
        dryRun: options.dryRun,
    });

    return cloudflareSyncPlan;
}

/**
 * Logs domains that were skipped during Cloudflare planning.
 *
 * @param skippedDomains - Skipped Cloudflare domains.
 * @param dryRun - Whether the sync is running in dry-run mode.
 */
function logCloudflareSkippedDomains(skippedDomains: ReadonlyArray<CloudflareSkippedDomain>, dryRun: boolean): void {
    for (const skippedDomain of skippedDomains) {
        logSyncEvent('warn', 'cloudflare_domain_skipped', {
            domain: skippedDomain.domain,
            reason: skippedDomain.reason,
            dryRun,
        });
    }
}

/**
 * Creates all planned Cloudflare DNS records.
 *
 * @param options - Cloudflare record creation options.
 */
async function syncCloudflareDnsRecordCreations(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly recordsToCreate: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly dryRun: boolean;
}): Promise<void> {
    for (const recordToCreate of options.recordsToCreate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_create_planned', {
                domain: recordToCreate.name,
                zone: recordToCreate.zoneName,
                type: recordToCreate.type,
                content: recordToCreate.content,
                proxied: recordToCreate.proxied,
                ttl: recordToCreate.ttl,
                dryRun: true,
            });
            continue;
        }

        await createCloudflareDnsRecord(options.cloudflareConfiguration, recordToCreate);
        logSyncEvent('info', 'cloudflare_record_created', {
            domain: recordToCreate.name,
            zone: recordToCreate.zoneName,
            type: recordToCreate.type,
            content: recordToCreate.content,
            proxied: recordToCreate.proxied,
            ttl: recordToCreate.ttl,
            dryRun: false,
        });
    }
}

/**
 * Updates all planned Cloudflare DNS records.
 *
 * @param options - Cloudflare record update options.
 */
async function syncCloudflareDnsRecordUpdates(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly recordsToUpdate: ReadonlyArray<CloudflareDnsRecordUpdate>;
    readonly dryRun: boolean;
}): Promise<void> {
    for (const recordToUpdate of options.recordsToUpdate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_update_planned', {
                domain: recordToUpdate.desiredRecord.name,
                zone: recordToUpdate.desiredRecord.zoneName,
                type: recordToUpdate.desiredRecord.type,
                currentContent: recordToUpdate.currentRecord.content,
                desiredContent: recordToUpdate.desiredRecord.content,
                reasons: recordToUpdate.reasons,
                dryRun: true,
            });
            continue;
        }

        await updateCloudflareDnsRecord(options.cloudflareConfiguration, recordToUpdate);
        logSyncEvent('info', 'cloudflare_record_updated', {
            domain: recordToUpdate.desiredRecord.name,
            zone: recordToUpdate.desiredRecord.zoneName,
            type: recordToUpdate.desiredRecord.type,
            currentContent: recordToUpdate.currentRecord.content,
            desiredContent: recordToUpdate.desiredRecord.content,
            reasons: recordToUpdate.reasons,
            dryRun: false,
        });
    }
}
