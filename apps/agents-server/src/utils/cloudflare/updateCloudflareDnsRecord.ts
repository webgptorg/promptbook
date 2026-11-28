import type { CloudflareApiConfiguration, CloudflareDnsRecordWriteInput } from './CloudflareApi';
import { createCloudflareDnsRecordRequestBody } from './createCloudflareDnsRecordRequestBody';
import { requestCloudflare } from './requestCloudflare';

/**
 * Updates one existing Cloudflare DNS record.
 *
 * @param configuration - Cloudflare API configuration.
 * @param record - DNS record to write over the existing Cloudflare record.
 */
export async function updateCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    record: CloudflareDnsRecordWriteInput & {
        /**
         * Cloudflare id of the record that is overwritten.
         */
        readonly recordId: string;
    },
): Promise<void> {
    await requestCloudflare({
        configuration,
        method: 'PATCH',
        pathname: `/zones/${encodeURIComponent(record.zoneId)}/dns_records/${encodeURIComponent(record.recordId)}`,
        body: createCloudflareDnsRecordRequestBody(record),
    });
}
