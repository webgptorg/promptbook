import type { ManagedServerDnsDiagnostic } from '../../app/superadmin/servers/ServersRegistryDnsTypes';
import { createAgentProjectsDnsRecordsSection } from '../agentProjects/createAgentProjectsDnsRecordsSection';
import { createEmailDnsRecordsSection } from '../stalwart/createEmailDnsRecordsSection';
import type { DnsRecordsSection } from './DnsRecordsSection';
import { createServerDomainDnsRecordsSection } from './createServerDomainDnsRecordsSection';

/**
 * Creates every DNS section which one Agents Server needs to be fully configured.
 *
 * This is the single source of truth of the complete DNS setup of one server, so that `/superadmin/servers` can show
 * the server domain, the generated project domains, and the email records in one manual and one Cloudflare wizard.
 *
 * @param options - Server domain, its DNS diagnostic, and the generated project domain state.
 * @returns All DNS sections of one server.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function createServerDnsRecordsSections(options: {
    /**
     * Public domain of the Agents Server.
     */
    readonly serverDomain: string;

    /**
     * DNS verification details of the server domain, when the deployment provides them.
     */
    readonly dnsDiagnostic: ManagedServerDnsDiagnostic | null | undefined;

    /**
     * Whether at least one generated project domain currently fails DNS verification.
     */
    readonly isProjectDnsIssue?: boolean;

    /**
     * Example generated project domain, when one is already assigned.
     */
    readonly projectDomain?: string | null;
}): ReadonlyArray<DnsRecordsSection> {
    const publicIpAddress = options.dnsDiagnostic?.publicIpAddress ?? null;
    const serverDomainSection = createServerDomainDnsRecordsSection({
        serverDomain: options.serverDomain,
        dnsDiagnostic: options.dnsDiagnostic,
    });

    return [
        ...(serverDomainSection ? [serverDomainSection] : []),
        createAgentProjectsDnsRecordsSection({
            isDnsIssue: options.isProjectDnsIssue,
            projectDomain: options.projectDomain,
            publicIpAddress,
            serverDomain: options.serverDomain,
        }),
        createEmailDnsRecordsSection({
            domain: options.serverDomain,
            publicIpAddress,
        }),
    ];
}
