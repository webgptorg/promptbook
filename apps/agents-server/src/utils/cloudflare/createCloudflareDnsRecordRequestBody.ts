import { isProxyableCloudflareDnsRecordType, type CloudflareDnsRecordWriteInput } from './CloudflareApi';
import { normalizeCloudflareDnsRecordContent } from './normalizeCloudflareDnsRecordContent';

/**
 * Cloudflare expects the mail exchanger priority of an `MX` record outside of its content.
 */
const CLOUDFLARE_MX_RECORD_CONTENT_PATTERN = /^(\d+)\s+(\S+)$/;

/**
 * Cloudflare expects the flags, tag, and value of a `CAA` record as structured data.
 */
const CLOUDFLARE_CAA_RECORD_CONTENT_PATTERN = /^(\d+)\s+(\S+)\s+"?([^"]*)"?$/;

/**
 * Creates the Cloudflare API request body for one written DNS record.
 *
 * Zone-file style values are translated into the structured fields Cloudflare expects, so that the DNS manual can keep
 * showing one human-readable value per record.
 *
 * @param record - DNS record to create or update.
 * @returns Cloudflare API request body.
 */
export function createCloudflareDnsRecordRequestBody(record: CloudflareDnsRecordWriteInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
        type: record.type,
        name: record.name,
        ttl: record.ttl,
        comment: record.comment,
        ...createCloudflareDnsRecordContentPayload(record.type, record.content),
    };

    if (isProxyableCloudflareDnsRecordType(record.type)) {
        body.proxied = record.proxied;
    }
    if (record.tags && record.tags.length > 0) {
        body.tags = record.tags;
    }

    return body;
}

/**
 * Translates one zone-file style record value into the Cloudflare content fields.
 *
 * @param type - DNS record type.
 * @param content - Record value as shown in the DNS manual.
 * @returns Content, priority, and structured data understood by the Cloudflare API.
 */
export function createCloudflareDnsRecordContentPayload(
    type: string,
    content: string,
): {
    readonly content?: string;
    readonly priority?: number;
    readonly data?: Record<string, unknown>;
} {
    const normalizedType = type.toUpperCase();
    const normalizedContent = normalizeCloudflareDnsRecordContent(normalizedType, content);

    if (normalizedType === 'MX') {
        const mailExchangerMatch = CLOUDFLARE_MX_RECORD_CONTENT_PATTERN.exec(normalizedContent);

        if (mailExchangerMatch) {
            return {
                content: (mailExchangerMatch[2] || '').replace(/\.$/, ''),
                priority: Number(mailExchangerMatch[1]),
            };
        }
    }

    if (normalizedType === 'CAA') {
        const certificateAuthorityMatch = CLOUDFLARE_CAA_RECORD_CONTENT_PATTERN.exec(normalizedContent);

        if (certificateAuthorityMatch) {
            return {
                data: {
                    flags: Number(certificateAuthorityMatch[1]),
                    tag: certificateAuthorityMatch[2],
                    value: certificateAuthorityMatch[3],
                },
            };
        }
    }

    return { content: normalizedContent };
}
