import { updateCloudflareDnsRecord } from '../../src/utils/cloudflare/updateCloudflareDnsRecord';
import {
    createCloudflareManagedRecordComment,
    mergeCloudflareDnsRecordTags,
} from './CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
import type { CloudflareApiConfiguration, CloudflareDnsRecordUpdate } from './CloudflareDnsRecordSyncPlan';

/**
 * Updates one Cloudflare DNS record while preserving existing non-automation comments and tags.
 *
 * @param configuration - Cloudflare API configuration.
 * @param update - Existing and desired record pair.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function updateManagedCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    update: CloudflareDnsRecordUpdate,
): Promise<void> {
    await updateCloudflareDnsRecord(configuration, {
        ...update.desiredRecord,
        recordId: update.currentRecord.id,
        comment: createCloudflareManagedRecordComment(update.currentRecord.comment),
        tags: mergeCloudflareDnsRecordTags(update.currentRecord.tags),
    });
}
