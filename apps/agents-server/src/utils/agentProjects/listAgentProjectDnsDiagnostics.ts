import type { ManagedServerDnsDiagnostic } from '../../app/superadmin/servers/ServersRegistryDnsTypes';
import { createStandaloneVpsDomainDnsDiagnostic, type ResolveDnsAddresses } from '../standaloneVpsDnsDiagnostics';
import { normalizeServerDomain } from '../serverRegistry';
import { createAgentProjectDnsRecord } from './createAgentProjectDnsRecords';
import type { AgentProjectDomainRecord } from './agentProjectRuntimeDomains';

/**
 * Separator used in generated project DNS diagnostic lookup keys.
 */
const AGENT_PROJECT_DNS_DIAGNOSTIC_LOOKUP_KEY_SEPARATOR = '::';

/**
 * DNS diagnostic tied to one generated agent project domain.
 *
 * @private shared by Agent Projects and standalone VPS server administration
 */
export type AgentProjectDnsDiagnostic = {
    /**
     * Permanent id of the agent that owns the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Generated public hostname whose DNS resolution was checked.
     */
    readonly projectDomain: string;

    /**
     * Resolution state and the recommended wildcard project DNS record.
     */
    readonly dnsDiagnostic: ManagedServerDnsDiagnostic;
};

/**
 * Lists DNS diagnostics for generated project domains belonging to one server.
 *
 * Custom domains intentionally remain outside this check because their DNS setup is owned
 * by the custom domain rather than the server's generated-project wildcard.
 *
 * @param options - Persisted assignments, server scope, and optional DNS resolver override.
 * @returns Generated project domain diagnostics for the selected server.
 *
 * @private shared by Agent Projects and standalone VPS server administration
 */
export async function listAgentProjectDnsDiagnostics(options: {
    readonly projectDomainRecords: ReadonlyArray<AgentProjectDomainRecord>;
    readonly publicIpAddress: string | null | undefined;
    readonly resolveDnsAddresses?: ResolveDnsAddresses;
    readonly serverDomain: string | null | undefined;
}): Promise<ReadonlyArray<AgentProjectDnsDiagnostic>> {
    const serverDomain = normalizeServerDomain(options.serverDomain || '');

    if (!serverDomain) {
        return [];
    }

    const generatedProjectDomainRecords = options.projectDomainRecords.filter(
        (projectDomainRecord) =>
            projectDomainRecord.customDomain === null &&
            normalizeServerDomain(projectDomainRecord.serverDomain) === serverDomain,
    );

    return await Promise.all(
        generatedProjectDomainRecords.map(async (projectDomainRecord) => ({
            agentPermanentId: projectDomainRecord.agentPermanentId,
            projectName: projectDomainRecord.projectName,
            projectDomain: projectDomainRecord.domain,
            dnsDiagnostic: await createStandaloneVpsDomainDnsDiagnostic({
                domain: projectDomainRecord.domain,
                publicIpAddress: options.publicIpAddress,
                resolveDnsAddresses: options.resolveDnsAddresses,
                expectedRecords: [
                    createAgentProjectDnsRecord({
                        isCnameRecord: true,
                        isWildcardDomain: true,
                        projectDomain: projectDomainRecord.domain,
                        publicIpAddress: options.publicIpAddress,
                        serverDomain,
                    }),
                ],
            }),
        })),
    );
}

/**
 * Determines whether one generated project domain needs DNS attention.
 *
 * @param diagnostic - Project DNS diagnostic to inspect.
 * @returns `true` when the project domain is not verified.
 *
 * @private shared by Agent Projects and standalone VPS server administration
 */
export function isAgentProjectDnsDiagnosticIssue(diagnostic: AgentProjectDnsDiagnostic): boolean {
    return diagnostic.dnsDiagnostic.status !== 'verified';
}

/**
 * Indexes generated project DNS diagnostics by their owning agent and project name.
 *
 * @param projectDnsDiagnostics - Diagnostics to index.
 * @returns Case-insensitive diagnostic lookup keyed by agent and project.
 *
 * @private shared by Agent Projects and standalone VPS server administration
 */
export function createAgentProjectDnsDiagnosticLookup(
    projectDnsDiagnostics: ReadonlyArray<AgentProjectDnsDiagnostic>,
): ReadonlyMap<string, AgentProjectDnsDiagnostic> {
    return new Map(
        projectDnsDiagnostics.map((projectDnsDiagnostic) => [
            createAgentProjectDnsDiagnosticLookupKey(
                projectDnsDiagnostic.agentPermanentId,
                projectDnsDiagnostic.projectName,
            ),
            projectDnsDiagnostic,
        ]),
    );
}

/**
 * Creates a case-insensitive lookup key for one generated project DNS diagnostic.
 *
 * @param agentPermanentId - Permanent id of the project owner.
 * @param projectName - Project directory name.
 * @returns Stable diagnostic lookup key.
 *
 * @private shared by Agent Projects and standalone VPS server administration
 */
export function createAgentProjectDnsDiagnosticLookupKey(agentPermanentId: string, projectName: string): string {
    return [agentPermanentId.toLowerCase(), projectName.toLowerCase()].join(
        AGENT_PROJECT_DNS_DIAGNOSTIC_LOOKUP_KEY_SEPARATOR,
    );
}
