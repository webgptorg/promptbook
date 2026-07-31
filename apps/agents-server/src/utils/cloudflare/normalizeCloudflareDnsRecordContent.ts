/**
 * Normalizes Cloudflare DNS content for comparison and payload generation.
 *
 * @param type - DNS record type.
 * @param content - Raw record content.
 * @returns Normalized content.
 */
export function normalizeCloudflareDnsRecordContent(type: string, content: string): string {
    const normalizedContent = content.trim();
    if (type === 'CNAME') {
        return normalizedContent.replace(/\.$/, '').toLowerCase();
    }
    return normalizedContent;
}
