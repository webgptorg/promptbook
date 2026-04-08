import type { CloudflareApiConfiguration, DesiredCloudflareDnsRecord } from './CloudflareDnsRecordSyncPlan';
import { requestCloudflare } from './requestCloudflare';

/**
 * Creates one Cloudflare DNS record.
 *
 * @param configuration - Cloudflare API configuration.
 * @param desiredRecord - Desired DNS record.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function createCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    desiredRecord: DesiredCloudflareDnsRecord,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: desiredRecord.type,
        name: desiredRecord.name,
        content: desiredRecord.content,
        proxied: desiredRecord.proxied,
        ttl: desiredRecord.ttl,
        comment: desiredRecord.comment,
    };
    if (desiredRecord.tags.length > 0) {
        body.tags = desiredRecord.tags;
    }

    await requestCloudflare({
        configuration,
        method: 'POST',
        pathname: `/zones/${encodeURIComponent(desiredRecord.zoneId)}/dns_records`,
        body,
    });
}
