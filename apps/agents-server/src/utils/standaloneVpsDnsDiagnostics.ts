import { lookup } from 'dns/promises';
import type {
    ManagedServerDnsDiagnostic,
    ManagedServerDnsExpectedRecord,
    ManagedServerDnsProviderGuide,
    ManagedServerDnsStatus,
} from '../app/admin/servers/ServersRegistryDnsTypes';

/**
 * Resolver signature used for DNS lookups.
 */
type ResolveDnsAddresses = (domain: string) => Promise<ReadonlyArray<string>>;

/**
 * Input used to create one standalone VPS DNS diagnostic.
 */
type CreateStandaloneVpsDomainDnsDiagnosticOptions = {
    /**
     * Domain currently configured in the standalone VPS server registry.
     */
    readonly domain: string;

    /**
     * Public IP address detected/stored for the VPS runtime.
     */
    readonly publicIpAddress: string | null | undefined;

    /**
     * Optional already-working hostname that subdomains may target via CNAME.
     */
    readonly fallbackCnameTargetDomain?: string | null | undefined;

    /**
     * Optional resolver override used by unit tests.
     */
    readonly resolveDnsAddresses?: ResolveDnsAddresses;
};

/**
 * Provider guides shown together with DNS record instructions.
 */
const DNS_PROVIDER_GUIDES: ReadonlyArray<ManagedServerDnsProviderGuide> = [
    {
        label: 'Cloudflare DNS records',
        href: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    },
    {
        label: 'GoDaddy DNS records',
        href: 'https://www.godaddy.com/help/manage-dns-records-680',
    },
    {
        label: 'Namecheap DNS records',
        href: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
    },
    {
        label: 'Squarespace DNS records',
        href: 'https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-managed-domain',
    },
];

/**
 * DNS error codes treated as "not resolving yet" during propagation.
 */
const DNS_PENDING_ERROR_CODES = new Set(['ENOTFOUND', 'ENODATA', 'EAI_AGAIN', 'ESERVFAIL']);

/**
 * Creates the browser-safe DNS status for one standalone VPS domain.
 *
 * @param options - Domain, VPS IP, and optional resolver override.
 * @returns DNS diagnostic rendered on `/admin/servers`.
 */
export async function createStandaloneVpsDomainDnsDiagnostic(
    options: CreateStandaloneVpsDomainDnsDiagnosticOptions,
): Promise<ManagedServerDnsDiagnostic> {
    const publicIpAddress = normalizePublicIpAddress(options.publicIpAddress);
    const expectedRecords = createExpectedDnsRecords({
        domain: options.domain,
        publicIpAddress,
        fallbackCnameTargetDomain: options.fallbackCnameTargetDomain,
    });

    if (!publicIpAddress) {
        return createDnsDiagnostic({
            expectedRecords,
            publicIpAddress: null,
            resolvedAddresses: [],
            status: 'unavailable',
            summary: 'The VPS public IP address is not available yet, so DNS cannot be verified automatically.',
        });
    }

    try {
        const resolvedAddresses = uniqueStrings(
            await (options.resolveDnsAddresses || resolveDnsAddresses)(options.domain),
        );

        if (resolvedAddresses.includes(publicIpAddress)) {
            return createDnsDiagnostic({
                expectedRecords,
                publicIpAddress,
                resolvedAddresses,
                status: 'verified',
                summary: `DNS is ready. \`${options.domain}\` resolves to this VPS.`,
            });
        }

        if (resolvedAddresses.length === 0) {
            return createDnsDiagnostic({
                expectedRecords,
                publicIpAddress,
                resolvedAddresses,
                status: 'pending',
                summary: `\`${options.domain}\` does not resolve yet. Add the record below and wait for DNS propagation.`,
            });
        }

        return createDnsDiagnostic({
            expectedRecords,
            publicIpAddress,
            resolvedAddresses,
            status: 'misconfigured',
            summary: `\`${options.domain}\` currently resolves to ${resolvedAddresses.join(', ')}, not to this VPS IP \`${publicIpAddress}\`.`,
        });
    } catch (error) {
        return createDnsDiagnostic({
            expectedRecords,
            publicIpAddress,
            resolvedAddresses: [],
            status: 'unavailable',
            summary: `DNS verification failed: ${error instanceof Error ? error.message : 'Unknown DNS lookup error.'}`,
        });
    }
}

/**
 * Resolves one hostname to all currently known IP addresses.
 *
 * @param domain - Domain to resolve.
 * @returns Unique list of resolved IP addresses.
 */
async function resolveDnsAddresses(domain: string): Promise<ReadonlyArray<string>> {
    try {
        return (await lookup(domain, { all: true, verbatim: true })).map((record) => record.address);
    } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null;

        if (code && DNS_PENDING_ERROR_CODES.has(code)) {
            return [];
        }

        throw error;
    }
}

/**
 * Creates the expected DNS records shown in the admin UI.
 *
 * @param options - Record inputs.
 * @returns DNS records the admin can copy into their provider.
 */
function createExpectedDnsRecords(options: {
    readonly domain: string;
    readonly publicIpAddress: string | null;
    readonly fallbackCnameTargetDomain?: string | null | undefined;
}): ReadonlyArray<ManagedServerDnsExpectedRecord> {
    const expectedRecords: Array<ManagedServerDnsExpectedRecord> = [];

    if (options.publicIpAddress) {
        expectedRecords.push({
            type: isIpv6Address(options.publicIpAddress) ? 'AAAA' : 'A',
            name: options.domain,
            value: options.publicIpAddress,
            note: 'Recommended. Point this hostname directly to the VPS public IP address.',
        });
    }

    if (options.fallbackCnameTargetDomain && options.fallbackCnameTargetDomain !== options.domain) {
        expectedRecords.push({
            type: 'CNAME',
            name: options.domain,
            value: options.fallbackCnameTargetDomain,
            note: `Optional alternative for subdomains only. Use this only when \`${options.fallbackCnameTargetDomain}\` already works on this VPS.`,
        });
    }

    return expectedRecords;
}

/**
 * Normalizes the stored VPS public IP address.
 *
 * @param value - Raw environment/config value.
 * @returns Normalized IP address or `null` when unavailable.
 */
function normalizePublicIpAddress(value: string | null | undefined): string | null {
    const normalizedValue = (value || '').trim();

    if (!normalizedValue || normalizedValue === 'localhost') {
        return null;
    }

    return normalizedValue;
}

/**
 * Creates one consistent browser payload for the DNS diagnostic.
 *
 * @param options - Normalized DNS state.
 * @returns Browser-safe DNS payload.
 */
function createDnsDiagnostic(options: {
    readonly expectedRecords: ReadonlyArray<ManagedServerDnsExpectedRecord>;
    readonly publicIpAddress: string | null;
    readonly resolvedAddresses: ReadonlyArray<string>;
    readonly status: ManagedServerDnsStatus;
    readonly summary: string;
}): ManagedServerDnsDiagnostic {
    return {
        status: options.status,
        summary: options.summary,
        publicIpAddress: options.publicIpAddress,
        resolvedAddresses: options.resolvedAddresses,
        expectedRecords: options.expectedRecords,
        providerGuides: DNS_PROVIDER_GUIDES,
    };
}

/**
 * Detects whether one resolved address is IPv6.
 *
 * @param value - Candidate IP address.
 * @returns `true` when the address looks like IPv6.
 */
function isIpv6Address(value: string): boolean {
    return value.includes(':');
}

/**
 * Removes empty values and duplicates while preserving order.
 *
 * @param values - Candidate values.
 * @returns Stable unique list.
 */
function uniqueStrings(values: ReadonlyArray<string>): Array<string> {
    const uniqueValues: Array<string> = [];

    for (const value of values) {
        const normalizedValue = value.trim();

        if (!normalizedValue || uniqueValues.includes(normalizedValue)) {
            continue;
        }

        uniqueValues.push(normalizedValue);
    }

    return uniqueValues;
}
