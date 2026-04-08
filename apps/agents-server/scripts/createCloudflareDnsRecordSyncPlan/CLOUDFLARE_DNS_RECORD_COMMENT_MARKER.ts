import type { CloudflareDnsRecord } from './CloudflareDnsRecordSyncPlan';

/**
 * Cloudflare DNS records created or updated by this script are marked by this visible comment fragment.
 *
 * @private constant of `sync-vercel-domains`
 */
export const CLOUDFLARE_DNS_RECORD_COMMENT_MARKER = 'Managed by Promptbook sync-vercel-domains.ts';

/**
 * Cloudflare DNS records created or updated by this script are tagged with this stable tag.
 */
const CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG = 'managed-by:promptbook-sync-vercel-domains';

/**
 * Checks whether the Cloudflare record comment already contains the automation marker.
 *
 * @param comment - Optional Cloudflare record comment.
 * @returns `true` when the marker is present.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function hasCloudflareManagedRecordComment(comment: string | null | undefined): boolean {
    return typeof comment === 'string' && comment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER);
}

/**
 * Checks whether the Cloudflare record tags already contain the automation tag.
 *
 * @param tags - Optional Cloudflare record tags.
 * @returns `true` when the automation tag is present.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function hasCloudflareAutomationTag(tags: ReadonlyArray<string> | null | undefined): boolean {
    return Boolean((tags || []).some((tag) => tag === CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG));
}

/**
 * Determines whether Cloudflare automation tags should be used in addition to comments.
 *
 * Some zones and accounts have zero tag quota, so comments are the safe default marker.
 *
 * @returns `true` when tags are explicitly enabled.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function shouldUseCloudflareAutomationTags(): boolean {
    return process.env.PROMPTBOOK_SYNC_CLOUDFLARE_USE_TAGS === 'true';
}

/**
 * Checks whether the Cloudflare DNS record already carries the automation marker.
 *
 * @param record - Cloudflare DNS record.
 * @returns `true` when the record looks auto-managed by this script.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function isManagedCloudflareDnsRecord(record: CloudflareDnsRecord): boolean {
    return hasCloudflareManagedRecordComment(record.comment) || hasCloudflareAutomationTag(record.tags);
}

/**
 * Creates a visible Cloudflare record comment that preserves any pre-existing comment text.
 *
 * @param existingComment - Existing Cloudflare record comment.
 * @returns Updated comment string.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function createCloudflareManagedRecordComment(existingComment: string | null | undefined): string {
    const normalizedExistingComment = typeof existingComment === 'string' ? existingComment.trim() : '';
    if (!normalizedExistingComment) {
        return CLOUDFLARE_DNS_RECORD_COMMENT_MARKER;
    }
    if (normalizedExistingComment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER)) {
        return normalizedExistingComment;
    }

    return `${normalizedExistingComment} | ${CLOUDFLARE_DNS_RECORD_COMMENT_MARKER}`;
}

/**
 * Merges existing Cloudflare tags with the stable automation tag.
 *
 * @param tags - Existing Cloudflare record tags.
 * @returns Updated unique tag list.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export function mergeCloudflareDnsRecordTags(tags: ReadonlyArray<string> | null | undefined): Array<string> {
    if (!shouldUseCloudflareAutomationTags()) {
        return [...(tags || [])];
    }

    const mergedTags = [...(tags || [])];
    if (!mergedTags.includes(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG)) {
        mergedTags.push(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG);
    }
    return mergedTags;
}
