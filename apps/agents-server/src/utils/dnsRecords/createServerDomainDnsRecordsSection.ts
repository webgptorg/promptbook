import {
    isManagedServerDnsDiagnosticIssue,
    type ManagedServerDnsDiagnostic,
} from '../../app/superadmin/servers/ServersRegistryDnsTypes';
import type { DnsRecordsSection } from './DnsRecordsSection';

/**
 * Creates the DNS section which makes the Agents Server itself reachable on its own domain.
 *
 * @param options - Server domain and its DNS diagnostic.
 * @returns Server domain section, or `null` when the deployment does not verify server domains.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function createServerDomainDnsRecordsSection(options: {
    /**
     * Public domain of the Agents Server.
     */
    readonly serverDomain: string;

    /**
     * DNS verification details of the server domain, when the deployment provides them.
     */
    readonly dnsDiagnostic: ManagedServerDnsDiagnostic | null | undefined;
}): DnsRecordsSection | null {
    const { dnsDiagnostic, serverDomain } = options;

    if (!dnsDiagnostic || dnsDiagnostic.expectedRecords.length === 0) {
        return null;
    }

    return {
        id: 'server-domain',
        title: `Server domain ${serverDomain}`,
        description: `Makes the Agents Server reachable on ${serverDomain} and lets it issue its HTTPS certificate.`,
        variants: [
            {
                id: 'server-domain',
                label: 'Server domain',
                recordSelection: 'one',
                records: dnsDiagnostic.expectedRecords,
            },
        ],
        statusSummary: dnsDiagnostic.summary,
        resolvedAddresses: dnsDiagnostic.resolvedAddresses,
        isDnsIssue: isManagedServerDnsDiagnosticIssue(dnsDiagnostic),
    };
}
