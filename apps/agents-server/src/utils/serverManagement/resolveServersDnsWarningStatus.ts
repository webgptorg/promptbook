import { isAgentsServerSqliteMode } from '../../database/agentsServerDatabaseMode';
import {
    isAgentProjectDnsDiagnosticIssue,
    listAgentProjectDnsDiagnostics,
} from '../agentProjects/listAgentProjectDnsDiagnostics';
import { listAgentProjectDomainRecords } from '../agentProjects/agentProjectRuntimeDomains';
import { isManagedServerDnsDiagnosticIssue } from '../../app/superadmin/servers/ServersRegistryDnsTypes';
import { listManagedServers } from './listManagedServers';
import { createStandaloneVpsDomainDnsDiagnostic } from '../standaloneVpsDnsDiagnostics';

/**
 * Resolves whether the Super Admin Servers page contains DNS diagnostics requiring attention.
 *
 * The Servers page exposes both registered server domains and their generated project domains, so
 * its menu warning intentionally covers either type of DNS problem. Managed multi-server
 * deployments do not expose these standalone VPS diagnostics and therefore have no warning here.
 *
 * @param isGlobalAdmin - Whether the current viewer is the environment-backed super-admin.
 * @returns `true` when the Servers menu item should display a warning indicator.
 *
 * @private shared by the root layout and Super Admin server diagnostics
 */
export async function resolveServersDnsWarningStatus(isGlobalAdmin: boolean): Promise<boolean> {
    if (!isGlobalAdmin || !isAgentsServerSqliteMode()) {
        return false;
    }

    try {
        const [servers, projectDomainRecords] = await Promise.all([
            listManagedServers(),
            listAgentProjectDomainRecords(),
        ]);
        const primaryDomain = servers[0]?.domain ?? null;
        const [serverDnsDiagnostics, projectDnsDiagnostics] = await Promise.all([
            Promise.all(
                servers.map((server) =>
                    createStandaloneVpsDomainDnsDiagnostic({
                        domain: server.domain,
                        publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
                        fallbackCnameTargetDomain:
                            primaryDomain && primaryDomain !== server.domain ? primaryDomain : null,
                    }),
                ),
            ),
            Promise.all(
                servers.map((server) =>
                    listAgentProjectDnsDiagnostics({
                        projectDomainRecords,
                        publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
                        serverDomain: server.domain,
                    }),
                ),
            ),
        ]);

        return (
            serverDnsDiagnostics.some(isManagedServerDnsDiagnosticIssue) ||
            projectDnsDiagnostics.flat().some(isAgentProjectDnsDiagnosticIssue)
        );
    } catch (error) {
        console.error('Failed to resolve registered-server DNS warning status:', error);
        return false;
    }
}
