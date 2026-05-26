import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { ForbiddenPage } from '../components/ForbiddenPage/ForbiddenPage';
import { HomepagePrimarySections } from '../components/Homepage/HomepagePrimarySections';
import { $provideServer } from '../tools/$provideServer';
import { isUserAdmin } from '../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../utils/isUserGlobalAdmin';
import {
    createServerPublicUrl,
    listRegisteredServersUsingServiceRole,
    resolveRegisteredServerByHost,
    type ServerRecord,
} from '../utils/serverRegistry';
import { getHomePageAgents } from './_data/getHomePageAgents';

/**
 * Renders the simplified agents home page with local and federated agents.
 */
export default async function HomePage() {
    const headerStore = await headers();
    $sideEffect(/* Note: [??] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headerStore);

    const ipAddressRouting = await resolveIpAddressRouting(headerStore.get('host'));
    if (ipAddressRouting === 'LOGIN') {
        return <ForbiddenPage />;
    }

    if (ipAddressRouting === 'CONFIGURE') {
        redirect('/admin/servers?setup=1');
    }

    if (Array.isArray(ipAddressRouting)) {
        return <IpAddressDomainChooser servers={ipAddressRouting} />;
    }

    const [{ publicUrl }, isAdmin, { agents, folders, homepageMessage, currentUser }] = await Promise.all([
        $provideServer(),
        isUserAdmin(), /* <- TODO: [??] Here should be user permissions */
        getHomePageAgents(),
    ]);

    return (
        <div className="agents-server-route-shell min-h-screen">
            <div className="container mx-auto px-4 py-16">
                <HomepagePrimarySections
                    agents={agents}
                    folders={folders}
                    isAdmin={isAdmin}
                    canOrganize={Boolean(currentUser)}
                    publicUrl={publicUrl.href}
                    homepageMessage={homepageMessage}
                />
            </div>
        </div>
    );
}

/**
 * Resolves special raw-IP behavior for standalone VPS access.
 *
 * @param host - Request host header.
 * @returns Routing instruction or `null` when normal homepage rendering should continue.
 */
async function resolveIpAddressRouting(host: string | null): Promise<'LOGIN' | 'CONFIGURE' | ReadonlyArray<ServerRecord> | null> {
    if (!host || !isIpAddressHost(host)) {
        return null;
    }

    const registeredServers = await listRegisteredServersUsingServiceRole().catch(() => []);
    if (resolveRegisteredServerByHost(host, registeredServers)) {
        return null;
    }

    if (registeredServers.length === 0) {
        return (await isUserGlobalAdmin()) ? 'CONFIGURE' : 'LOGIN';
    }

    if (registeredServers.length === 1) {
        redirect(createServerPublicUrl(registeredServers[0]!.domain).href);
    }

    return registeredServers;
}

/**
 * Checks whether the request host is a raw IPv4 or IPv6 address.
 *
 * @param host - Raw host header.
 * @returns `true` for IP-address access.
 */
function isIpAddressHost(host: string): boolean {
    const hostname = host
        .trim()
        .replace(/^\[(.+)\](?::\d+)?$/u, '$1')
        .replace(/:\d+$/u, '');

    return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) || hostname.includes(':');
}

/**
 * Simple domain chooser shown when a raw IP has multiple configured domains.
 *
 * @param props - Configured server list.
 */
function IpAddressDomainChooser(props: { readonly servers: ReadonlyArray<ServerRecord> }) {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-24">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-900">Choose a domain</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This VPS has multiple Agents Server domains configured. Open the domain you want to use.
                    </p>
                </div>
                <div className="grid gap-3">
                    {props.servers.map((server) => {
                        const url = createServerPublicUrl(server.domain).href;
                        return (
                            <Link
                                key={server.id}
                                href={url}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                            >
                                {server.domain}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
