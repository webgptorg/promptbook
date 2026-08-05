import { CheckCircle2, Mail, Server, TriangleAlert } from 'lucide-react';
import { DnsRecordsInstructions } from '../../../components/DnsRecordsInstructions/DnsRecordsInstructions';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { StalwartSynchronizeButton } from '../../../components/StalwartSynchronizeButton/StalwartSynchronizeButton';
import { $provideServer } from '../../../tools/$provideServer';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { createEmailDnsRecordsSection } from '../../../utils/stalwart/createEmailDnsRecordsSection';
import {
    isStalwartEmailSnapshotOperational,
    readStalwartEmailSnapshot,
} from '../../../utils/stalwart/readStalwartEmailSnapshot';
import { isManagedServerDnsDiagnosticIssue } from '../../superadmin/servers/ServersRegistryDnsTypes';
import { AdminConfigurationShell } from '../_components/AdminConfigurationShell';
import { $synchronizeStalwartEmailDomain } from './actions';

/**
 * Always reads live Stalwart and agent state.
 */
export const dynamic = 'force-dynamic';

/**
 * Domain-level administration for the bundled Stalwart email service.
 */
export default async function AdminEmailServerPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const server = await $provideServer();
    const snapshot = await readStalwartEmailSnapshot(server.publicUrl.hostname);
    const emailDnsRecordsSection = createEmailDnsRecordsSection({
        domain: snapshot.domain,
        publicIpAddress: snapshot.mailDnsDiagnostic.publicIpAddress,
        statusSummary: snapshot.mailDnsDiagnostic.summary,
        isDnsIssue: isManagedServerDnsDiagnosticIssue(snapshot.mailDnsDiagnostic),
    });
    const isOperational = isStalwartEmailSnapshotOperational(snapshot);

    return (
        <AdminConfigurationShell activePage="email-server">
            <div className="space-y-6">
                <section
                    className={`rounded-xl border p-5 ${
                        isOperational
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                            : 'border-amber-200 bg-amber-50 text-amber-950'
                    }`}
                >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            {isOperational ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                            ) : (
                                <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                            )}
                            <div>
                                <h2 className="font-semibold">
                                    {isOperational ? 'Agent email is operational' : 'Agent email needs attention'}
                                </h2>
                                <p className="mt-1 text-sm">
                                    Domain <code>{snapshot.domain}</code> · API{' '}
                                    {snapshot.isReachable ? 'reachable' : 'unavailable'} · bridge{' '}
                                    {snapshot.isBridgeAccountConfigured ? 'configured' : 'missing'} · inbound hook{' '}
                                    {snapshot.isInboundHookConfigured ? 'configured' : 'missing'} · public mail DNS{' '}
                                    {snapshot.mailDnsDiagnostic.status === 'verified' ? 'verified' : 'needs attention'}
                                </p>
                                {snapshot.errorMessage ? (
                                    <p className="mt-2 max-w-4xl whitespace-pre-wrap text-xs">
                                        {snapshot.errorMessage}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <StalwartSynchronizeButton
                            label="Synchronize Stalwart"
                            synchronize={$synchronizeStalwartEmailDomain}
                        />
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Mail className="h-5 w-5 text-gray-400" />
                        Agent addresses
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Dotted, compact, permanent-id, and plus-tagged variants route to the same agent.
                    </p>
                    <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {snapshot.agents.map((agent) => (
                            <div key={agent.permanentId} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_2fr]">
                                <div>
                                    <p className="font-medium text-gray-900">{agent.displayName}</p>
                                    <p className="text-xs text-gray-500">{agent.visibility}</p>
                                </div>
                                <div>
                                    <code className="text-sm text-gray-800">{agent.preferredEmail}</code>
                                    <p className="mt-1 break-all text-xs text-gray-500">
                                        {agent.aliases.map((alias) => `${alias}@${snapshot.domain}`).join(', ')}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {snapshot.agents.length === 0 ? (
                            <p className="px-4 py-5 text-sm text-gray-500">
                                No active agents have email addresses yet.
                            </p>
                        ) : null}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Server className="h-5 w-5 text-gray-400" />
                        Domain and DNS instructions
                    </h2>
                    <div className="mt-4">
                        <DnsRecordsInstructions
                            description={
                                <p>
                                    Add these records at your DNS provider. The complete DNS setup of this server -
                                    including its own domain and its generated project domains - is configured together
                                    on the Super Admin <span className="font-mono">/superadmin/servers</span> page.
                                </p>
                            }
                            domain={snapshot.domain}
                            sections={[emailDnsRecordsSection]}
                        />
                    </div>
                    <div className="mt-4 space-y-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-950">
                        <p>
                            <strong>DKIM:</strong> copy every DKIM record from Stalwart’s generated zone below. The
                            selector and public key are generated by Stalwart and must not be invented.
                        </p>
                        <p>
                            <strong>Reverse DNS / PTR:</strong> ask the VPS provider to map the sending IP to{' '}
                            <code>mail.{snapshot.domain}</code>. Forward and reverse DNS must agree.
                        </p>
                        <p>
                            <strong>MTA-STS:</strong> serve the policy below as plain text from{' '}
                            <code>https://mta-sts.{snapshot.domain}/.well-known/mta-sts.txt</code> with a publicly
                            trusted TLS certificate.
                        </p>
                        <p>
                            <strong>SMTP TLS:</strong> after <code>mail.{snapshot.domain}</code> resolves publicly,
                            configure Stalwart ACME certificate management or import a publicly trusted certificate for
                            that hostname.
                        </p>
                        <p>
                            Open TCP port <code>25</code> publicly. Keep the submission port <code>465</code> firewalled
                            unless external mail clients need it, and never expose the Stalwart management API on port{' '}
                            <code>8080</code>.
                        </p>
                    </div>
                    <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 text-xs text-gray-100">
                        {`version: STSv1\nmode: enforce\nmx: mail.${snapshot.domain}\nmax_age: 604800`}
                    </pre>
                    <h3 className="mt-5 text-sm font-semibold text-gray-900">Stalwart authoritative zone</h3>
                    <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 text-xs text-gray-100">
                        {snapshot.dnsZoneFile ||
                            'Synchronize the domain and make the Stalwart API reachable to load generated DKIM and mail DNS records.'}
                    </pre>
                </section>
            </div>
        </AdminConfigurationShell>
    );
}
