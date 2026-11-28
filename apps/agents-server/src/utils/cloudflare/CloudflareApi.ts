/**
 * Cloudflare DNS records managed by Promptbook are never proxied.
 *
 * Both the domain sync and the Cloudflare DNS wizard need the original DNS target to stay visible, because Vercel
 * matches on it and the Agents Server verifies that a hostname resolves directly to the VPS.
 */
export const CLOUDFLARE_DNS_RECORD_PROXIED = false;

/**
 * Cloudflare TTL `1` means automatic.
 */
export const CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC = 1;

/**
 * DNS record types for which Cloudflare offers a proxy-status choice.
 */
const CLOUDFLARE_PROXYABLE_DNS_RECORD_TYPES: ReadonlySet<string> = new Set(['A', 'AAAA', 'CNAME']);

/**
 * Cloudflare API configuration.
 */
export type CloudflareApiConfiguration = {
    /**
     * API token used for authentication.
     */
    readonly token: string;
};

/**
 * Minimal Cloudflare zone metadata used for domain-to-zone matching.
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
 * Minimal Cloudflare DNS record payload.
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
     * Mail exchanger priority of `MX` records.
     */
    readonly priority?: number | null;

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
 * One DNS record written to Cloudflare.
 */
export type CloudflareDnsRecordWriteInput = {
    /**
     * Zone id that contains the DNS record.
     */
    readonly zoneId: string;

    /**
     * DNS record type.
     */
    readonly type: string;

    /**
     * Fully qualified record name.
     */
    readonly name: string;

    /**
     * Record value as written in a zone file, for example `10 mail.example.com.` for an `MX` record.
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
     * User-visible record comment marking the record as managed by Promptbook.
     */
    readonly comment: string;

    /**
     * Optional record tags.
     */
    readonly tags?: ReadonlyArray<string>;
};

/**
 * Checks whether Cloudflare offers a proxy-status choice for one DNS record type.
 *
 * @param type - DNS record type.
 * @returns `true` when the record can be proxied through Cloudflare.
 */
export function isProxyableCloudflareDnsRecordType(type: string): boolean {
    return CLOUDFLARE_PROXYABLE_DNS_RECORD_TYPES.has(type.toUpperCase());
}

/**
 * Normalizes one DNS record name for comparison between Cloudflare and the Agents Server DNS manual.
 *
 * Unlike generic domain normalization this keeps wildcard and underscore labels intact.
 *
 * @param name - Raw DNS record name.
 * @returns Comparable record name.
 */
export function normalizeCloudflareDnsRecordName(name: string): string {
    return name.trim().toLowerCase().replace(/\.$/, '');
}
