import type { CloudflareApiConfiguration, CloudflareZone } from './CloudflareDnsRecordSyncPlan';
import { requestCloudflare } from './requestCloudflare';

/**
 * Maximum number of Cloudflare zones loaded from one API page.
 */
const CLOUDFLARE_ZONES_PAGE_LIMIT = 100;

/**
 * Lists all Cloudflare zones accessible by the configured API token.
 *
 * @param configuration - Cloudflare API configuration.
 * @returns Accessible Cloudflare zones.
 *
 * @private function of `syncCloudflareDnsRecords`
 */
export async function listCloudflareZones(configuration: CloudflareApiConfiguration): Promise<Array<CloudflareZone>> {
    const zones: Array<CloudflareZone> = [];
    let page = 1;
    let totalPages = 1;

    do {
        const searchParams = new URLSearchParams({
            page: String(page),
            per_page: String(CLOUDFLARE_ZONES_PAGE_LIMIT),
        });
        const response = await requestCloudflare<Array<CloudflareZone>>({
            configuration,
            method: 'GET',
            pathname: '/zones',
            searchParams,
        });

        zones.push(...response.result);
        totalPages = response.result_info?.total_pages || 1;
        page++;
    } while (page <= totalPages);

    return zones;
}
