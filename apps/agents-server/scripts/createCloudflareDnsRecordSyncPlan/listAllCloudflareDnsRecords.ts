import type { CloudflareApiConfiguration, CloudflareDnsRecord } from './CloudflareDnsRecordSyncPlan';
import { requestCloudflare } from './requestCloudflare';

/**
 * Maximum number of Cloudflare DNS records loaded from one API page.
 */
const CLOUDFLARE_DNS_RECORDS_PAGE_LIMIT = 100;

/**
 * Lists all Cloudflare DNS records for one zone.
 *
 * @param configuration - Cloudflare API configuration.
 * @param zoneId - Zone id containing the record.
 * @returns DNS records in the zone.
 *
 * @private function of `createCloudflareDnsRecordSyncPlan`
 */
export async function listAllCloudflareDnsRecords(
    configuration: CloudflareApiConfiguration,
    zoneId: string,
): Promise<Array<CloudflareDnsRecord>> {
    const records: Array<CloudflareDnsRecord> = [];
    let page = 1;
    let totalPages = 1;

    do {
        const searchParams = new URLSearchParams({
            page: String(page),
            per_page: String(CLOUDFLARE_DNS_RECORDS_PAGE_LIMIT),
        });

        const response = await requestCloudflare<Array<CloudflareDnsRecord>>({
            configuration,
            method: 'GET',
            pathname: `/zones/${encodeURIComponent(zoneId)}/dns_records`,
            searchParams,
        });

        records.push(...response.result);
        totalPages = response.result_info?.total_pages || 1;
        page++;
    } while (page <= totalPages);

    return records;
}
