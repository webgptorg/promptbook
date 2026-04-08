/**
 * Cloudflare DNS records should not be proxied because Vercel must see the original DNS target directly.
 *
 * @private constant of `resolveDesiredCloudflareDnsRecord`
 */
export const CLOUDFLARE_DNS_RECORD_PROXIED = false;

/**
 * Cloudflare TTL `1` means automatic.
 *
 * @private constant of `resolveDesiredCloudflareDnsRecord`
 */
export const CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC = 1;

/**
 * Cloudflare API configuration loaded from environment variables.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareApiConfiguration = {
    /**
     * API token used for authentication.
     */
    readonly token: string;
};

/**
 * Minimal Cloudflare zone metadata used for domain-to-zone matching.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareZone = {
    /**
     * Cloudflare zone id.
     */
    readonly id: string;
    /**
     * Zone apex name.
     */
    readonly name: string;
};

/**
 * Minimal Cloudflare DNS record payload used by the sync script.
 *
 * @private type of `sync-vercel-domains`
 */
export type CloudflareDnsRecord = {
    /**
     * Cloudflare DNS record id.
     */
    readonly id: string;
    /**
     * DNS record type.
     */
    readonly type: string;
    /**
     * Fully qualified record name.
     */
    readonly name: string;
    /**
     * Record content or target.
     */
    readonly content: string;
    /**
     * Whether the record is proxied through Cloudflare.
     */
    readonly proxied?: boolean | null;
    /**
     * Record TTL.
     */
    readonly ttl?: number | null;
    /**
     * Optional user-visible record comment.
     */
    readonly comment?: string | null;
    /**
     * Optional record tags.
     */
    readonly tags?: ReadonlyArray<string>;
};

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
