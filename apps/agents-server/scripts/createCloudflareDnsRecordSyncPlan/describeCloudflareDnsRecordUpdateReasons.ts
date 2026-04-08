import {
    hasCloudflareAutomationTag,
    hasCloudflareManagedRecordComment,
    shouldUseCloudflareAutomationTags,
} from './CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
import {
    CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
    type CloudflareDnsRecord,
    type DesiredCloudflareDnsRecord,
} from './CloudflareDnsRecordSyncPlan';
import { normalizeCloudflareDnsRecordContent } from './normalizeCloudflareDnsRecordContent';

/**
 * Lists human-readable reasons why a Cloudflare DNS record should be updated.
 *
 * @param currentRecord - Existing Cloudflare DNS record.
 * @param desiredRecord - Desired Cloudflare DNS record.
 * @returns Update reasons.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function describeCloudflareDnsRecordUpdateReasons(
    currentRecord: CloudflareDnsRecord,
    desiredRecord: DesiredCloudflareDnsRecord,
): Array<string> {
    const reasons: Array<string> = [];

    if (normalizeCloudflareDnsRecordContent(currentRecord.type, currentRecord.content) !== desiredRecord.content) {
        reasons.push(`content ${currentRecord.content} -> ${desiredRecord.content}`);
    }

    if (Boolean(currentRecord.proxied) !== desiredRecord.proxied) {
        reasons.push(
            `proxied ${currentRecord.proxied ? 'true' : 'false'} -> ${desiredRecord.proxied ? 'true' : 'false'}`,
        );
    }

    if ((currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC) !== desiredRecord.ttl) {
        reasons.push(
            `ttl ${String(currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC)} -> ${String(desiredRecord.ttl)}`,
        );
    }

    if (!hasCloudflareManagedRecordComment(currentRecord.comment)) {
        reasons.push('comment marker missing');
    }

    if (shouldUseCloudflareAutomationTags() && !hasCloudflareAutomationTag(currentRecord.tags)) {
        reasons.push('automation tag missing');
    }

    return reasons;
}
