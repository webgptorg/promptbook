import { headers } from 'next/headers';
import { getSession } from './session';
import { listRegisteredServersUsingServiceRole, type ServerRecord } from './serverRegistry';
import { resolveServerSelection } from './serverSelection';

/**
 * Current server context resolved from host headers plus the optional global-admin override.
 */
export type CurrentServerRegistryContext = {
    /**
     * Effective current server for the request.
     */
    readonly currentServer: ServerRecord | null;
    /**
     * Server matched directly from the request host before applying any override.
     */
    readonly hostServer: ServerRecord | null;
    /**
     * All registered servers known to the current deployment.
     */
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    /**
     * Whether the effective server differs from the host-matched server.
     */
    readonly isOverridden: boolean;
};

/**
 * Resolves the effective same-instance server for the current request.
 *
 * @returns Host-matched and effective server records together with the registry snapshot.
 */
export async function resolveCurrentServerRegistryContext(): Promise<CurrentServerRegistryContext> {
    const [headerStore, session, registeredServers] = await Promise.all([
        headers(),
        getSession(),
        listRegisteredServersUsingServiceRole(),
    ]);

    const { currentServer, hostServer, isOverridden } = resolveServerSelection({
        host: headerStore.get('host'),
        forwardedServerHost: headerStore.get('x-promptbook-server'),
        registeredServers,
        activeServerId: session?.activeServerId,
        allowOverride: session?.isGlobalAdmin === true,
    });

    return {
        currentServer,
        hostServer,
        registeredServers,
        isOverridden,
    };
}
