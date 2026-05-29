/**
 * Supported DNS verification states shown for standalone VPS domains.
 *
 * @private shared type for the `/admin/servers` registry flow
 */
export type ManagedServerDnsStatus = 'verified' | 'pending' | 'misconfigured' | 'unavailable';

/**
 * One DNS record instruction rendered in the admin UI.
 *
 * @private shared type for the `/admin/servers` registry flow
 */
export type ManagedServerDnsExpectedRecord = {
    /**
     * DNS record type.
     */
    readonly type: 'A' | 'AAAA' | 'CNAME';

    /**
     * Hostname/record name that should be configured.
     */
    readonly name: string;

    /**
     * Expected record target value.
     */
    readonly value: string;

    /**
     * Optional note clarifying when to use the record.
     */
    readonly note: string | null;
};

/**
 * One external DNS-provider help link shown with the setup guidance.
 *
 * @private shared type for the `/admin/servers` registry flow
 */
export type ManagedServerDnsProviderGuide = {
    /**
     * Human-readable provider label.
     */
    readonly label: string;

    /**
     * Official provider help URL.
     */
    readonly href: string;
};

/**
 * DNS diagnostic payload returned for one standalone VPS domain.
 *
 * @private shared type for the `/admin/servers` registry flow
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
