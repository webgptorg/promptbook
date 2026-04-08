export { CLOUDFLARE_DNS_RECORD_COMMENT_MARKER } from './createCloudflareDnsRecordSyncPlan/CLOUDFLARE_DNS_RECORD_COMMENT_MARKER';
export {
    type CloudflareApiConfiguration,
    type CloudflareDnsRecord,
    type CloudflareDnsRecordSyncPlan,
    type CloudflareDnsRecordUpdate,
    type CloudflareSkippedDomain,
    type CloudflareSyncConfigurationResolution,
    type CloudflareZone,
    type DesiredCloudflareDnsRecord,
} from './createCloudflareDnsRecordSyncPlan/CloudflareDnsRecordSyncPlan';
export { createCloudflareDnsRecordSyncPlan } from './createCloudflareDnsRecordSyncPlan/createCloudflareDnsRecordSyncPlan';
export { normalizeCloudflareDnsRecordContent } from './createCloudflareDnsRecordSyncPlan/normalizeCloudflareDnsRecordContent';
export { resolveCloudflareSyncConfiguration } from './createCloudflareDnsRecordSyncPlan/resolveCloudflareSyncConfiguration';
export { resolveDesiredCloudflareDnsRecord } from './createCloudflareDnsRecordSyncPlan/resolveDesiredCloudflareDnsRecord';
export { syncCloudflareDnsRecords } from './createCloudflareDnsRecordSyncPlan/syncCloudflareDnsRecords';
