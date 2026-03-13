import { headers } from 'next/headers';
import { listRegisteredServersUsingServiceRole, type ServerRecord } from './serverRegistry';
import { resolveServerSelection } from './serverSelection';

/**
 * Current server context resolved from host headers.
 */
export type CurrentServerRegistryContext = {
    /**
     * Effective current server for the request.
     */
    readonly currentServer: ServerRecord | null;
    /**
     * Server matched directly from the request host.
     */
    readonly hostServer: ServerRecord | null;
    /**
     * All registered servers known to the current deployment.
     */
    readonly registeredServers: ReadonlyArray<ServerRecord>;
};

/**
 * Resolves the effective same-instance server for the current request.
 *
 * @returns Host-matched and effective server records together with the registry snapshot.
 */
export async function resolveCurrentServerRegistryContext(): Promise<CurrentServerRegistryContext> {
    const [headerStore, registeredServers] = await Promise.all([headers(), listRegisteredServersUsingServiceRole()]);

    const { currentServer, hostServer } = resolveServerSelection({
        host: headerStore.get('host'),
        forwardedServerHost: headerStore.get('x-promptbook-server'),
        registeredServers,
    });

    return {
        currentServer,
        hostServer,
        registeredServers,
    };
}
