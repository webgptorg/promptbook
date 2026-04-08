import type { CloudflareApiConfiguration, CloudflareSyncConfigurationResolution } from './CloudflareDnsRecordSyncPlan';

/**
 * Resolves optional Cloudflare sync configuration from environment variables.
 *
 * @returns Loaded configuration or a human-readable skip reason.
 *
 * @private function of `sync-vercel-domains`
 */
export function resolveCloudflareSyncConfiguration(): CloudflareSyncConfigurationResolution {
    if (process.env.PROMPTBOOK_SYNC_CLOUDFLARE === 'false') {
        return {
            configuration: null,
            skippedReason: 'Cloudflare sync disabled by `PROMPTBOOK_SYNC_CLOUDFLARE=false`.',
        };
    }

    const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!token) {
        return {
            configuration: null,
            skippedReason: 'Cloudflare sync skipped because `CLOUDFLARE_API_TOKEN` is missing.',
        };
    }

    const configuration: CloudflareApiConfiguration = { token };
    return {
        configuration,
        skippedReason: null,
    };
}
