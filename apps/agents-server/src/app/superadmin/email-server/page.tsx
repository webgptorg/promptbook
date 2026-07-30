import { Mail, ServerCog, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { StalwartSynchronizeButton } from '../../../components/StalwartSynchronizeButton/StalwartSynchronizeButton';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { listManagedServers } from '../../../utils/serverManagement/listManagedServers';
import { readStalwartConfiguration } from '../../../utils/stalwart/StalwartConfiguration';
import { $synchronizeAllStalwartEmailDomains } from './actions';

/**
 * VPS-wide Stalwart installation and domain overview.
 */
export default async function SuperAdminEmailServerPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    const configuration = readStalwartConfiguration();
    const servers = await listManagedServers();

    return (
        <main className="container mx-auto space-y-6 px-4 py-8">
            <header className="mt-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Super Admin</p>
                    <h1 className="mt-1 flex items-center gap-2 text-3xl font-light text-gray-900">
                        <ServerCog className="h-7 w-7 text-gray-400" />
                        VPS email server
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-gray-500">
                        The bundled Stalwart service handles inbound SMTP, authenticated outbound submission, DKIM,
                        and domain mail routing for every Agents Server on this VPS.
                    </p>
                </div>
                <StalwartSynchronizeButton
                    label="Synchronize all domains"
                    synchronize={$synchronizeAllStalwartEmailDomains}
                />
            </header>

            <section className="grid gap-4 md:grid-cols-3">
                <StatusCard
                    icon={ServerCog}
                    label="Management API"
                    value={configuration.isConfigured ? 'Configured' : 'Incomplete'}
                    detail={configuration.apiUrl}
                />
                <StatusCard
                    icon={ShieldCheck}
                    label="Inbound authentication"
                    value={configuration.hookToken ? 'Configured' : 'Missing'}
                    detail="Bearer token shared only by Stalwart and Agents Server"
                />
                <StatusCard
                    icon={Mail}
                    label="SMTP submission"
                    value={configuration.smtpPassword ? 'Configured' : 'Missing'}
                    detail="Local authenticated transport on port 587"
                />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">Server domains</h2>
                <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {servers.map((server) => (
                        <div key={server.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-medium text-gray-900">{server.name}</p>
                                <code className="text-xs text-gray-500">{server.domain}</code>
                            </div>
                            <Link
                                href={`https://${server.domain}/admin/email-server`}
                                className="text-sm font-semibold text-blue-700 hover:underline"
                            >
                                Manage domain email
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
                <h2 className="text-lg font-semibold text-gray-900">Secure service administration</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5">
                    <li>
                        Confirm <code>systemctl status stalwart</code> on the VPS.
                    </li>
                    <li>
                        Keep Stalwart HTTP/JMAP port <code>8080</code> bound to localhost; use an SSH tunnel for direct
                        Stalwart administration.
                    </li>
                    <li>
                        Open inbound SMTP port <code>25</code>; keep local submission on <code>587</code> firewalled
                        from the public Internet and retain Nginx on <code>80</code>/<code>443</code>.
                    </li>
                    <li>
                        Use each domain page to synchronize aliases and copy Stalwart’s generated DKIM zone records.
                    </li>
                </ol>
                <p className="mt-4">
                    Stalwart stores its data in <code>/var/lib/stalwart</code> and configuration in{' '}
                    <code>/etc/stalwart</code> on standalone installations.
                </p>
            </section>
        </main>
    );
}

/**
 * Small VPS-wide Stalwart status card.
 */
function StatusCard(props: {
    readonly icon: typeof ServerCog;
    readonly label: string;
    readonly value: string;
    readonly detail: string;
}) {
    const Icon = props.icon;
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <Icon className="h-5 w-5 text-gray-400" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{props.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{props.value}</p>
            <p className="mt-1 break-all text-xs text-gray-500">{props.detail}</p>
        </div>
    );
}
