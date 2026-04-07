import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import {
    getVercelDomainConfiguration,
    type VercelApiConfiguration,
    type VercelDomainConfiguration,
} from './createVercelDomainSyncPlan';
import { logSyncEvent } from './logSyncEvent';
import { normalizeManagedDomain } from './normalizeManagedDomain';

/**
 * Default Cloudflare API base URL.
 */
const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

/**
 * Maximum number of Cloudflare zones loaded from one API page.
 */
const CLOUDFLARE_ZONES_PAGE_LIMIT = 100;

/**
 * Maximum number of Cloudflare DNS records loaded from one API page.
 */
const CLOUDFLARE_DNS_RECORDS_PAGE_LIMIT = 100;

/**
 * Cloudflare DNS records created/updated by this script are marked by this visible comment fragment.
 *
 * @private constant of `sync-vercel-domains`
 */
export const CLOUDFLARE_DNS_RECORD_COMMENT_MARKER = 'Managed by Promptbook sync-vercel-domains.ts';

/**
 * Cloudflare DNS records created/updated by this script are tagged with this stable tag.
 */
const CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG = 'managed-by:promptbook-sync-vercel-domains';

/**
 * Cloudflare DNS records should not be proxied because Vercel must see the original DNS target directly.
 */
const CLOUDFLARE_DNS_RECORD_PROXIED = false;

/**
 * Cloudflare TTL `1` means automatic.
 */
const CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC = 1;

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
     * Record content/target.
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
     * Record content/target.
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
     * Managed domains skipped because the zone/record situation was unsafe or unsupported.
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

/**
 * Generic paginated Cloudflare API envelope.
 */
type CloudflareApiEnvelope<TResult> = {
    /**
     * Whether the API call succeeded.
     */
    readonly success: boolean;
    /**
     * Response payload.
     */
    readonly result: TResult;
    /**
     * Pagination metadata.
     */
    readonly result_info?: {
        /**
         * Current page number.
         */
        readonly page?: number;
        /**
         * Total number of pages.
         */
        readonly total_pages?: number;
    };
    /**
     * API error payloads.
     */
    readonly errors?: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Resolves optional Cloudflare sync configuration from environment variables.
 *
 * @returns Loaded configuration or a human-readable skip reason.
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

    return {
        configuration: { token },
        skippedReason: null,
    };
}

/**
 * Syncs Cloudflare DNS records for the desired managed domains.
 *
 * Note: This intentionally never deletes Cloudflare records, because one zone can contain subdomains for unrelated projects.
 *
 * @param options - Cloudflare/Vercel sync options.
 * @returns Planned/applied Cloudflare DNS changes.
 * @private function of `sync-vercel-domains`
 */
export async function syncCloudflareDnsRecords(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly desiredDomains: ReadonlyArray<string>;
    readonly dryRun: boolean;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const zones = await listCloudflareZones(options.cloudflareConfiguration);
    logSyncEvent('info', 'cloudflare_zones_loaded', {
        count: zones.length,
        dryRun: options.dryRun,
    });

    const desiredRecordsResolution = await resolveDesiredCloudflareDnsRecords({
        cloudflareConfiguration: options.cloudflareConfiguration,
        vercelConfiguration: options.vercelConfiguration,
        domains: options.desiredDomains,
        zones,
    });
    const cloudflareSyncPlan = await createCloudflareDnsRecordSyncPlan({
        cloudflareConfiguration: options.cloudflareConfiguration,
        desiredRecords: desiredRecordsResolution.desiredRecords,
        skippedDomains: desiredRecordsResolution.skippedDomains,
    });

    logSyncEvent('info', 'cloudflare_sync_planned', {
        createCount: cloudflareSyncPlan.recordsToCreate.length,
        updateCount: cloudflareSyncPlan.recordsToUpdate.length,
        skippedCount: cloudflareSyncPlan.skippedDomains.length,
        dryRun: options.dryRun,
    });

    for (const skippedDomain of cloudflareSyncPlan.skippedDomains) {
        logSyncEvent('warn', 'cloudflare_domain_skipped', {
            domain: skippedDomain.domain,
            reason: skippedDomain.reason,
            dryRun: options.dryRun,
        });
    }

    for (const recordToCreate of cloudflareSyncPlan.recordsToCreate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_create_planned', {
                domain: recordToCreate.name,
                zone: recordToCreate.zoneName,
                type: recordToCreate.type,
                content: recordToCreate.content,
                proxied: recordToCreate.proxied,
                ttl: recordToCreate.ttl,
                dryRun: true,
            });
            continue;
        }

        await createCloudflareDnsRecord(options.cloudflareConfiguration, recordToCreate);
        logSyncEvent('info', 'cloudflare_record_created', {
            domain: recordToCreate.name,
            zone: recordToCreate.zoneName,
            type: recordToCreate.type,
            content: recordToCreate.content,
            proxied: recordToCreate.proxied,
            ttl: recordToCreate.ttl,
            dryRun: false,
        });
    }

    for (const recordToUpdate of cloudflareSyncPlan.recordsToUpdate) {
        if (options.dryRun) {
            logSyncEvent('info', 'cloudflare_record_update_planned', {
                domain: recordToUpdate.desiredRecord.name,
                zone: recordToUpdate.desiredRecord.zoneName,
                type: recordToUpdate.desiredRecord.type,
                currentContent: recordToUpdate.currentRecord.content,
                desiredContent: recordToUpdate.desiredRecord.content,
                reasons: recordToUpdate.reasons,
                dryRun: true,
            });
            continue;
        }

        await updateCloudflareDnsRecord(options.cloudflareConfiguration, recordToUpdate);
        logSyncEvent('info', 'cloudflare_record_updated', {
            domain: recordToUpdate.desiredRecord.name,
            zone: recordToUpdate.desiredRecord.zoneName,
            type: recordToUpdate.desiredRecord.type,
            currentContent: recordToUpdate.currentRecord.content,
            desiredContent: recordToUpdate.desiredRecord.content,
            reasons: recordToUpdate.reasons,
            dryRun: false,
        });
    }

    return cloudflareSyncPlan;
}

/**
 * Resolves the desired Cloudflare DNS record for one managed domain.
 *
 * @param domain - Managed domain.
 * @param zone - Matching Cloudflare zone.
 * @param domainConfiguration - Vercel DNS recommendations.
 * @returns Desired Cloudflare DNS record.
 */
export function resolveDesiredCloudflareDnsRecord(
    domain: string,
    zone: Pick<CloudflareZone, 'id' | 'name'>,
    domainConfiguration: VercelDomainConfiguration,
): DesiredCloudflareDnsRecord {
    const normalizedDomain = normalizeManagedDomain(domain);
    const normalizedZoneName = normalizeManagedDomain(zone.name);
    const preferredComment = createCloudflareManagedRecordComment(null);
    const preferredTags = shouldUseCloudflareAutomationTags() ? [CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG] : [];

    if (normalizedDomain === normalizedZoneName) {
        const preferredIpv4 = extractPreferredRecommendedIpv4(domainConfiguration.recommendedIPv4);
        if (!preferredIpv4) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to resolve a recommended IPv4 for apex domain \`${normalizedDomain}\` from Vercel.
                `),
            );
        }

        return {
            zoneId: zone.id,
            zoneName: normalizedZoneName,
            name: normalizedDomain,
            type: 'A',
            content: preferredIpv4,
            proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
            ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
            comment: preferredComment,
            tags: preferredTags,
        };
    }

    const preferredCname = extractPreferredRecommendedCname(domainConfiguration.recommendedCNAME);
    if (!preferredCname) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to resolve a recommended CNAME for subdomain \`${normalizedDomain}\` from Vercel.
            `),
        );
    }

    return {
        zoneId: zone.id,
        zoneName: normalizedZoneName,
        name: normalizedDomain,
        type: 'CNAME',
        content: preferredCname,
        proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
        ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
        comment: preferredComment,
        tags: preferredTags,
    };
}

/**
 * Creates a diff between desired Cloudflare DNS records and current records.
 *
 * @param options - Desired records and access to Cloudflare.
 * @returns Cloudflare DNS sync plan.
 */
export async function createCloudflareDnsRecordSyncPlan(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains?: ReadonlyArray<CloudflareSkippedDomain>;
}): Promise<CloudflareDnsRecordSyncPlan> {
    const recordsToCreate: Array<DesiredCloudflareDnsRecord> = [];
    const recordsToUpdate: Array<CloudflareDnsRecordUpdate> = [];
    const skippedDomains = [...(options.skippedDomains || [])];
    const zoneRecordsCache = new Map<string, ReadonlyArray<CloudflareDnsRecord>>();

    for (const desiredRecord of options.desiredRecords) {
        const existingZoneRecords =
            zoneRecordsCache.get(desiredRecord.zoneId) ||
            (await listAllCloudflareDnsRecords(options.cloudflareConfiguration, desiredRecord.zoneId));
        zoneRecordsCache.set(desiredRecord.zoneId, existingZoneRecords);

        const existingRecords = existingZoneRecords.filter(
            (existingRecord) => normalizeManagedDomain(existingRecord.name) === desiredRecord.name,
        );
        const selectedExistingRecord = selectCloudflareRecordForManagedDomain(existingRecords, desiredRecord);

        if (!selectedExistingRecord) {
            const conflictingRecords = existingRecords.filter(
                (existingRecord) => normalizeManagedDomain(existingRecord.name) === desiredRecord.name,
            );

            if (conflictingRecords.length > 0) {
                skippedDomains.push({
                    domain: desiredRecord.name,
                    reason: 'Cloudflare already contains conflicting or ambiguous records on this hostname, so no automatic create/update was attempted.',
                });
                continue;
            }

            recordsToCreate.push(desiredRecord);
            continue;
        }

        const updateReasons = describeCloudflareDnsRecordUpdateReasons(selectedExistingRecord, desiredRecord);
        if (updateReasons.length > 0) {
            recordsToUpdate.push({
                currentRecord: selectedExistingRecord,
                desiredRecord,
                reasons: updateReasons,
            });
        }
    }

    return {
        recordsToCreate,
        recordsToUpdate,
        skippedDomains,
    };
}

/**
 * Normalizes Cloudflare DNS content for comparison and payload generation.
 *
 * @param type - DNS record type.
 * @param content - Raw record content.
 * @returns Normalized content.
 * @private function of `sync-vercel-domains`
 */
export function normalizeCloudflareDnsRecordContent(type: string, content: string): string {
    const normalizedContent = content.trim();
    if (type === 'CNAME') {
        return normalizedContent.replace(/\.$/, '').toLowerCase();
    }
    return normalizedContent;
}

/**
 * Lists all Cloudflare zones accessible by the configured API token.
 *
 * @param configuration - Cloudflare API configuration.
 * @returns Accessible Cloudflare zones.
 */
async function listCloudflareZones(configuration: CloudflareApiConfiguration): Promise<Array<CloudflareZone>> {
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

/**
 * Resolves desired Cloudflare DNS records from Vercel domain recommendations.
 *
 * @param options - Cloudflare/Vercel domain metadata.
 * @returns Desired records plus domains that were skipped before record diffing.
 */
async function resolveDesiredCloudflareDnsRecords(options: {
    readonly cloudflareConfiguration: CloudflareApiConfiguration;
    readonly vercelConfiguration: VercelApiConfiguration;
    readonly domains: ReadonlyArray<string>;
    readonly zones: ReadonlyArray<CloudflareZone>;
}): Promise<{
    readonly desiredRecords: ReadonlyArray<DesiredCloudflareDnsRecord>;
    readonly skippedDomains: ReadonlyArray<CloudflareSkippedDomain>;
}> {
    const desiredRecords: Array<DesiredCloudflareDnsRecord> = [];
    const skippedDomains: Array<CloudflareSkippedDomain> = [];

    for (const domain of options.domains) {
        const zone = findBestMatchingCloudflareZoneForDomain(domain, options.zones);
        if (!zone) {
            skippedDomains.push({
                domain,
                reason: 'No matching Cloudflare zone was found for this managed domain.',
            });
            continue;
        }

        const domainConfiguration = await getVercelDomainConfiguration(options.vercelConfiguration, domain);
        desiredRecords.push(resolveDesiredCloudflareDnsRecord(domain, zone, domainConfiguration));
    }

    return {
        desiredRecords,
        skippedDomains,
    };
}

/**
 * Lists all Cloudflare DNS records for one zone.
 *
 * @param configuration - Cloudflare API configuration.
 * @param zoneId - Zone id containing the record.
 * @returns DNS records in the zone.
 */
async function listAllCloudflareDnsRecords(
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

/**
 * Creates one Cloudflare DNS record.
 *
 * @param configuration - Cloudflare API configuration.
 * @param desiredRecord - Desired DNS record.
 */
async function createCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    desiredRecord: DesiredCloudflareDnsRecord,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: desiredRecord.type,
        name: desiredRecord.name,
        content: desiredRecord.content,
        proxied: desiredRecord.proxied,
        ttl: desiredRecord.ttl,
        comment: desiredRecord.comment,
    };
    if (desiredRecord.tags.length > 0) {
        body.tags = desiredRecord.tags;
    }

    await requestCloudflare({
        configuration,
        method: 'POST',
        pathname: `/zones/${encodeURIComponent(desiredRecord.zoneId)}/dns_records`,
        body,
    });
}

/**
 * Updates one Cloudflare DNS record while preserving existing non-automation comments/tags.
 *
 * @param configuration - Cloudflare API configuration.
 * @param update - Existing/desired record pair.
 */
async function updateCloudflareDnsRecord(
    configuration: CloudflareApiConfiguration,
    update: CloudflareDnsRecordUpdate,
): Promise<void> {
    const body: Record<string, unknown> = {
        type: update.desiredRecord.type,
        name: update.desiredRecord.name,
        content: update.desiredRecord.content,
        proxied: update.desiredRecord.proxied,
        ttl: update.desiredRecord.ttl,
        comment: createCloudflareManagedRecordComment(update.currentRecord.comment),
    };
    const mergedTags = mergeCloudflareDnsRecordTags(update.currentRecord.tags);
    if (mergedTags.length > 0) {
        body.tags = mergedTags;
    }

    await requestCloudflare({
        configuration,
        method: 'PATCH',
        pathname: `/zones/${encodeURIComponent(update.desiredRecord.zoneId)}/dns_records/${encodeURIComponent(
            update.currentRecord.id,
        )}`,
        body,
    });
}

/**
 * Executes one Cloudflare API request and parses the JSON response envelope.
 *
 * @param options - HTTP request options.
 * @returns Parsed Cloudflare response envelope.
 */
async function requestCloudflare<TResult = Record<string, unknown>>(options: {
    readonly configuration: CloudflareApiConfiguration;
    readonly method: 'GET' | 'POST' | 'PATCH';
    readonly pathname: string;
    readonly searchParams?: URLSearchParams;
    readonly body?: Record<string, unknown>;
}): Promise<CloudflareApiEnvelope<TResult>> {
    const normalizedPathname = options.pathname.startsWith('/') ? options.pathname.slice(1) : options.pathname;
    const url = new URL(normalizedPathname, `${CLOUDFLARE_API_BASE_URL}/`);
    const serializedSearchParams = options.searchParams?.toString() || '';
    if (serializedSearchParams) {
        url.search = serializedSearchParams;
    }

    const response = await fetch(url, {
        method: options.method,
        headers: {
            Authorization: `Bearer ${options.configuration.token}`,
            'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const responseText = await response.text();

    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request failed.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Status: \`${response.status}\`
                Response: \`${responseText || '<empty>'}\`
            `),
        );
    }

    const parsedResponse = (
        responseText ? JSON.parse(responseText) : { success: true, result: {} }
    ) as CloudflareApiEnvelope<TResult>;
    if (!parsedResponse.success) {
        throw new DatabaseError(
            spaceTrim(`
                Cloudflare API request returned an unsuccessful envelope.

                Method: \`${options.method}\`
                URL: \`${url.toString()}\`
                Errors: \`${JSON.stringify(parsedResponse.errors || [])}\`
            `),
        );
    }

    return parsedResponse;
}

/**
 * Finds the best matching Cloudflare zone for one fully-qualified domain.
 *
 * @param domain - Fully-qualified managed domain.
 * @param zones - Accessible Cloudflare zones.
 * @returns Best matching zone or `null`.
 */
function findBestMatchingCloudflareZoneForDomain(
    domain: string,
    zones: ReadonlyArray<CloudflareZone>,
): CloudflareZone | null {
    const normalizedDomain = normalizeManagedDomain(domain);
    let bestMatch: CloudflareZone | null = null;

    for (const zone of zones) {
        const normalizedZoneName = normalizeManagedDomain(zone.name);
        if (normalizedDomain !== normalizedZoneName && !normalizedDomain.endsWith(`.${normalizedZoneName}`)) {
            continue;
        }

        if (!bestMatch || normalizedZoneName.length > normalizeManagedDomain(bestMatch.name).length) {
            bestMatch = zone;
        }
    }

    return bestMatch;
}

/**
 * Extracts the preferred Vercel-recommended IPv4 value.
 *
 * @param recommendedIpv4 - Ranked recommended IPv4 values.
 * @returns Preferred IPv4 or `null`.
 */
function extractPreferredRecommendedIpv4(
    recommendedIpv4: ReadonlyArray<{
        readonly rank: number;
        readonly value: ReadonlyArray<string>;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedIpv4].sort((left, right) => left.rank - right.rank)[0];
    const preferredValue = preferredRecommendation?.value[0];
    return preferredValue ? preferredValue.trim() : null;
}

/**
 * Extracts the preferred Vercel-recommended CNAME target.
 *
 * @param recommendedCname - Ranked recommended CNAME targets.
 * @returns Preferred CNAME target or `null`.
 */
function extractPreferredRecommendedCname(
    recommendedCname: ReadonlyArray<{
        readonly rank: number;
        readonly value: string;
    }>,
): string | null {
    const preferredRecommendation = [...recommendedCname].sort((left, right) => left.rank - right.rank)[0];
    return preferredRecommendation ? normalizeCloudflareDnsRecordContent('CNAME', preferredRecommendation.value) : null;
}

/**
 * Picks the Cloudflare record that should represent the managed hostname.
 *
 * @param existingRecords - Current Cloudflare records for the exact name.
 * @param desiredRecord - Desired Cloudflare record.
 * @returns Selected record or `null` when the situation is ambiguous.
 */
function selectCloudflareRecordForManagedDomain(
    existingRecords: ReadonlyArray<CloudflareDnsRecord>,
    desiredRecord: DesiredCloudflareDnsRecord,
): CloudflareDnsRecord | null {
    const matchingTypeRecords = existingRecords.filter((existingRecord) => existingRecord.type === desiredRecord.type);
    if (matchingTypeRecords.length === 0) {
        return null;
    }

    const managedRecords = matchingTypeRecords.filter(isManagedCloudflareDnsRecord);
    if (managedRecords.length === 1) {
        return managedRecords[0] || null;
    }
    if (managedRecords.length > 1) {
        return null;
    }

    const exactContentMatches = matchingTypeRecords.filter(
        (existingRecord) =>
            normalizeCloudflareDnsRecordContent(existingRecord.type, existingRecord.content) === desiredRecord.content,
    );
    if (exactContentMatches.length === 1) {
        return exactContentMatches[0] || null;
    }
    if (matchingTypeRecords.length === 1) {
        return matchingTypeRecords[0] || null;
    }

    return null;
}

/**
 * Lists human-readable reasons why a Cloudflare DNS record should be updated.
 *
 * @param currentRecord - Existing Cloudflare DNS record.
 * @param desiredRecord - Desired Cloudflare DNS record.
 * @returns Update reasons.
 */
function describeCloudflareDnsRecordUpdateReasons(
    currentRecord: CloudflareDnsRecord,
    desiredRecord: DesiredCloudflareDnsRecord,
): Array<string> {
    const reasons: Array<string> = [];

    if (normalizeCloudflareDnsRecordContent(currentRecord.type, currentRecord.content) !== desiredRecord.content) {
        reasons.push(`content ${currentRecord.content} -> ${desiredRecord.content}`);
    }

    if (Boolean(currentRecord.proxied) !== desiredRecord.proxied) {
        reasons.push(
            `proxied ${currentRecord.proxied ? 'true' : 'false'} -> ${desiredRecord.proxied ? 'true' : 'false'}`,
        );
    }

    if ((currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC) !== desiredRecord.ttl) {
        reasons.push(
            `ttl ${String(currentRecord.ttl || CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC)} -> ${String(desiredRecord.ttl)}`,
        );
    }

    if (!hasCloudflareManagedRecordComment(currentRecord.comment)) {
        reasons.push('comment marker missing');
    }

    if (shouldUseCloudflareAutomationTags() && !hasCloudflareAutomationTag(currentRecord.tags)) {
        reasons.push('automation tag missing');
    }

    return reasons;
}

/**
 * Checks whether the Cloudflare DNS record already carries the automation marker.
 *
 * @param record - Cloudflare DNS record.
 * @returns `true` when the record looks auto-managed by this script.
 */
function isManagedCloudflareDnsRecord(record: CloudflareDnsRecord): boolean {
    return hasCloudflareManagedRecordComment(record.comment) || hasCloudflareAutomationTag(record.tags);
}

/**
 * Checks whether the Cloudflare record comment already contains the automation marker.
 *
 * @param comment - Optional Cloudflare record comment.
 * @returns `true` when the marker is present.
 */
function hasCloudflareManagedRecordComment(comment: string | null | undefined): boolean {
    return typeof comment === 'string' && comment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER);
}

/**
 * Checks whether the Cloudflare record tags already contain the automation tag.
 *
 * @param tags - Optional Cloudflare record tags.
 * @returns `true` when the automation tag is present.
 */
function hasCloudflareAutomationTag(tags: ReadonlyArray<string> | null | undefined): boolean {
    return Boolean((tags || []).some((tag) => tag === CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG));
}

/**
 * Creates a visible Cloudflare record comment that preserves any pre-existing comment text.
 *
 * @param existingComment - Existing Cloudflare record comment.
 * @returns Updated comment string.
 */
function createCloudflareManagedRecordComment(existingComment: string | null | undefined): string {
    const normalizedExistingComment = typeof existingComment === 'string' ? existingComment.trim() : '';
    if (!normalizedExistingComment) {
        return CLOUDFLARE_DNS_RECORD_COMMENT_MARKER;
    }
    if (normalizedExistingComment.includes(CLOUDFLARE_DNS_RECORD_COMMENT_MARKER)) {
        return normalizedExistingComment;
    }

    return `${normalizedExistingComment} | ${CLOUDFLARE_DNS_RECORD_COMMENT_MARKER}`;
}

/**
 * Merges existing Cloudflare tags with the stable automation tag.
 *
 * @param tags - Existing Cloudflare record tags.
 * @returns Updated unique tag list.
 */
function mergeCloudflareDnsRecordTags(tags: ReadonlyArray<string> | null | undefined): Array<string> {
    if (!shouldUseCloudflareAutomationTags()) {
        return [...(tags || [])];
    }

    const mergedTags = [...(tags || [])];
    if (!mergedTags.includes(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG)) {
        mergedTags.push(CLOUDFLARE_DNS_RECORD_AUTOMATION_TAG);
    }
    return mergedTags;
}

/**
 * Determines whether Cloudflare automation tags should be used in addition to comments.
 *
 * Some zones/accounts have zero tag quota, so comments are the safe default marker.
 *
 * @returns `true` when tags are explicitly enabled.
 */
function shouldUseCloudflareAutomationTags(): boolean {
    return process.env.PROMPTBOOK_SYNC_CLOUDFLARE_USE_TAGS === 'true';
}
