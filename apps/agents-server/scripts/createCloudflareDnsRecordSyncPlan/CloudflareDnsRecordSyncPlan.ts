import type { CloudflareApiConfiguration, CloudflareDnsRecord } from '../../src/utils/cloudflare/CloudflareApi';

// Note: The Cloudflare API layer is shared with the Agents Server Cloudflare DNS wizard, so these are re-exported
//       from `src/utils/cloudflare` instead of being defined twice.
export {
    CLOUDFLARE_DNS_RECORD_PROXIED,
    CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
    type CloudflareApiConfiguration,
    type CloudflareDnsRecord,
    type CloudflareZone,
} from '../../src/utils/cloudflare/CloudflareApi';

/**
 * Desired Cloudflare DNS record derived from one managed domain.
 *
 * @private type of `sync-vercel-domains`
 */
export type DesiredCloudflareDnsRecord = {
    /**
     * Zone id containing the DNS record.
     */
    readonly zoneId: string;
    /**
     * Human-readable zone name.
     */
    readonly zoneName: string;
    /**
     * Fully qualified record name.
     */
    readonly name: string;
    /**
     * DNS record type.
     */
    readonly type: 'A' | 'CNAME';
    /**
     * Record content or target.
     */
    readonly content: string;
    /**
     * Whether the record is proxied through Cloudflare.
     */
    readonly proxied: boolean;
    /**
     * Record TTL.
     */
    readonly ttl: number;
    /**
     * Comment to apply on newly created records.
     */
    readonly comment: string;
    /**
     * Tags to apply on newly created records.
     */
    readonly tags: ReadonlyArray<string>;
};

/**
 * Cloudflare DNS record update step.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareDnsRecordUpdate = {
    /**
     * Existing Cloudflare DNS record.
     */
    readonly currentRecord: CloudflareDnsRecord;
    /**
     * Desired Cloudflare DNS record.
     */
    readonly desiredRecord: DesiredCloudflareDnsRecord;
    /**
     * Human-readable mismatch reasons.
     */
    readonly reasons: ReadonlyArray<string>;
};

/**
 * Managed domain skipped during Cloudflare sync planning.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareSkippedDomain = {
    /**
     * Managed domain that was skipped.
     */
    readonly domain: string;
    /**
     * Human-readable reason.
     */
    readonly reason: string;
};

/**
 * Diff between desired Cloudflare DNS records and current zone records.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareDnsRecordSyncPlan = {
    /**
     * DNS records that should be created.
     */
    readonly recordsToCreate: ReadonlyArray<DesiredCloudflareDnsRecord>;
    /**
     * DNS records that should be updated.
     */
    readonly recordsToUpdate: ReadonlyArray<CloudflareDnsRecordUpdate>;
    /**
     * Managed domains skipped because the zone or record situation was unsafe or unsupported.
     */
    readonly skippedDomains: ReadonlyArray<CloudflareSkippedDomain>;
};

/**
 * Cloudflare sync configuration resolution.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareSyncConfigurationResolution = {
    /**
     * Loaded configuration when sync is enabled.
     */
    readonly configuration: CloudflareApiConfiguration | null;
    /**
     * Human-readable skip reason when sync is disabled or unconfigured.
     */
    readonly skippedReason: string | null;
};
