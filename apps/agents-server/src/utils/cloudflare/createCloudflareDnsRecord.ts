import type { CloudflareApiConfiguration, CloudflareDnsRecordWriteInput } from './CloudflareApi';
import { createCloudflareDnsRecordRequestBody } from './createCloudflareDnsRecordRequestBody';
import { requestCloudflare } from './requestCloudflare';

/**
 * Creates one Cloudflare DNS record.
 *
 * @param configuration - Cloudflare API configuration.
 * @param record - DNS record to create.
 */
export async function createCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    record: CloudflareDnsRecordWriteInput,
): Promise<void> {
    await requestCloudflare({
        configuration,
        method: 'POST',
        pathname: `/zones/${encodeURIComponent(record.zoneId)}/dns_records`,
        body: createCloudflareDnsRecordRequestBody(record),
    });
}
