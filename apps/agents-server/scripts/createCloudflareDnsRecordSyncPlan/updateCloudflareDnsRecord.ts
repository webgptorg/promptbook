import {
    createCloudflareManagedRecordComment,
    mergeCloudflareDnsRecordTags,
} from './CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
import type { CloudflareApiConfiguration, CloudflareDnsRecordUpdate } from './CloudflareDnsRecordSyncPlan';
import { requestCloudflare } from './requestCloudflare';

/**
 * Updates one Cloudflare DNS record while preserving existing non-automation comments and tags.
 *
 * @param configuration - Cloudflare API configuration.
 * @param update - Existing and desired record pair.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function updateCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    update: CloudflareDnsRecordUpdate,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: update.desiredRecord.type,
        name: update.desiredRecord.name,
        content: update.desiredRecord.content,
        proxied: update.desiredRecord.proxied,
        ttl: update.desiredRecord.ttl,
        comment: createCloudflareManagedRecordComment(update.currentRecord.comment),
    };
    const mergedTags = mergeCloudflareDnsRecordTags(update.currentRecord.tags);
    if (mergedTags.length > 0) {
        body.tags = mergedTags;
    }

    await requestCloudflare({
        configuration,
        method: 'PATCH',
        pathname: `/zones/${encodeURIComponent(update.desiredRecord.zoneId)}/dns_records/${encodeURIComponent(
            update.currentRecord.id,
        )}`,
        body,
    });
}
