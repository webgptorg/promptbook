import type { DnsProviderGuide } from '../../../utils/dnsProviderGuides';
import type { DnsRecordInstruction } from '../../../utils/dnsRecords/DnsRecordInstruction';

/**
 * Supported DNS verification states shown for standalone VPS domains.
 *
 * @private shared type for the `/superadmin/servers` registry flow
 */
export type ManagedServerDnsStatus = 'verified' | 'pending' | 'misconfigured' | 'unavailable';

/**
 * One DNS record instruction rendered in the admin UI.
 *
 * @private shared type for the `/superadmin/servers` registry flow
 */
export type ManagedServerDnsExpectedRecord = DnsRecordInstruction & {
    /**
     * DNS record type supported by standalone VPS domain diagnostics.
     */
    readonly type: 'A' | 'AAAA' | 'CNAME';
};

/**
 * One external DNS-provider help link shown with the setup guidance.
 *
 * @private shared type for the `/superadmin/servers` registry flow
 */
export type ManagedServerDnsProviderGuide = DnsProviderGuide;

/**
 * DNS diagnostic payload returned for one standalone VPS domain.
 *
 * @private shared type for the `/superadmin/servers` registry flow
 */
export type ManagedServerDnsDiagnostic = {
    /**
     * Overall DNS verification state for the domain.
     */
    readonly status: ManagedServerDnsStatus;

    /**
     * Short human-readable explanation of the current state.
     */
    readonly summary: string;

    /**
     * Public IP address expected for direct DNS records.
     */
    readonly publicIpAddress: string | null;

    /**
     * Addresses currently returned by DNS for the configured domain.
     */
    readonly resolvedAddresses: ReadonlyArray<string>;

    /**
     * DNS records that the user can add at their provider.
     */
    readonly expectedRecords: ReadonlyArray<ManagedServerDnsExpectedRecord>;

    /**
     * Provider documentation links for updating DNS records.
     */
    readonly providerGuides: ReadonlyArray<ManagedServerDnsProviderGuide>;
};

/**
 * Determines whether a DNS diagnostic represents a configuration problem.
 *
 * @param diagnostic - Optional DNS diagnostic to inspect.
 * @returns `true` when DNS is not verified.
 *
 * @private shared type helper for the `/superadmin/servers` registry flow
 */
export function isManagedServerDnsDiagnosticIssue(
    diagnostic: ManagedServerDnsDiagnostic | null | undefined,
): boolean {
    return diagnostic?.status !== undefined && diagnostic.status !== 'verified';
}
