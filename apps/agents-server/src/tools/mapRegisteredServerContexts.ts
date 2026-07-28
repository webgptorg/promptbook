import {
    createServerPublicUrl,
    listRegisteredServersUsingServiceRole,
    normalizeServerDomain,
    resolveRegisteredServerByHost,
    type ServerRecord,
} from '../utils/serverRegistry';
import type { ProvidedServer } from './$provideServer';
import { runWithServerContextOverride } from './serverContextOverride';

/**
 * Result of running one callback inside a single registered server's context.
 *
 * @private internal type of Agents Server server-context routing
 */
export type ServerContextRun<TResult> = {
    /**
     * Registered server the callback ran for, or `null` when the deployment has no
     * registered servers and the callback ran once in the ambient request context.
     */
    readonly server: ServerRecord | null;

    /**
     * Value returned by the callback for this server.
     */
    readonly value: TResult;
};

/**
 * Runs one callback once per registered VPS server, each inside that server's routing context.
 *
 * This is the shared VPS-wide iteration primitive: it lets a single detached process
 * (a background worker tick or a superadmin aggregation) touch every server on the VPS
 * without a per-server `host` header. Servers are processed sequentially so per-server
 * work never competes for the same resources at once.
 *
 * When no servers are registered (for example local development or a single-tenant
 * deployment before the registry is populated) the callback runs exactly once in the
 * ambient request context with `server` resolved to `null`.
 *
 * @param callback - Work to run for each server; receives the server it runs for.
 * @returns One run result per server, in registry order.
 *
 * @private internal utility of Agents Server server-context routing
 */
export async function mapRegisteredServerContexts<TResult>(
    callback: (server: ServerRecord | null) => Promise<TResult>,
): Promise<Array<ServerContextRun<TResult>>> {
    const registeredServers = await listRegisteredServersUsingServiceRole();

    if (registeredServers.length === 0) {
        return [{ server: null, value: await callback(null) }];
    }

    const serverRuns: Array<ServerContextRun<TResult>> = [];
    for (const server of registeredServers) {
        const providedServer: ProvidedServer = {
            id: server.id,
            publicUrl: createServerPublicUrl(server.domain),
            tablePrefix: server.tablePrefix,
        };
        const value = await runWithServerContextOverride(providedServer, () => callback(server));
        serverRuns.push({ server, value });
    }

    return serverRuns;
}

/**
 * Runs one callback inside the registered server identified by its domain.
 *
 * The helper is used by VPS-wide admin actions after the listing has identified the owning
 * server. Returning `null` for an unknown domain keeps a stale task row from being treated as a
 * task belonging to the ambient request server.
 *
 * @param serverDomain - Domain of the registered server to enter.
 * @param callback - Work to run inside the selected server context.
 * @returns Callback result, or `null` when the server is no longer registered.
 *
 * @private internal utility of Agents Server server-context routing
 */
export async function runWithRegisteredServerContext<TResult>(
    serverDomain: string,
    callback: () => Promise<TResult>,
): Promise<TResult | null> {
    const normalizedServerDomain = normalizeServerDomain(serverDomain);
    if (!normalizedServerDomain) {
        return null;
    }

    const registeredServers = await listRegisteredServersUsingServiceRole();
    const server = resolveRegisteredServerByHost(normalizedServerDomain, registeredServers);
    if (!server) {
        return null;
    }

    const providedServer: ProvidedServer = {
        id: server.id,
        publicUrl: createServerPublicUrl(server.domain),
        tablePrefix: server.tablePrefix,
    };

    return runWithServerContextOverride(providedServer, callback);
}
