import { NEXT_PUBLIC_SITE_URL, SUPABASE_TABLE_PREFIX } from '@/config';
import { headers } from 'next/headers';
import { listRegisteredServersUsingServiceRole, resolveRegisteredServerByHost } from '../utils/serverRegistry';

/**
 * Resolved server routing context for the current request.
 */
type ProvidedServer = {
    /**
     * Public URL that should represent the current server.
     */
    readonly publicUrl: URL;
    /**
     * Table prefix used for the current server namespace.
     */
    readonly tablePrefix: string;
};

/**
 * Resolves the current server from request headers and the global `_Server` registry.
 *
 * Falls back to `SUPABASE_TABLE_PREFIX` only when no servers are registered
 * or when the request is clearly local development traffic.
 *
 * @returns Server routing context for the current request.
 */
export async function $provideServer(): Promise<ProvidedServer> {
    const headersList = await headers();
    const requestHost = headersList.get('host');
    const xPromptbookServer = headersList.get('x-promptbook-server');
    const registeredServers = await listRegisteredServersUsingServiceRole();

    if (registeredServers.length === 0 || isLocalDevelopmentHost(requestHost)) {
        return {
            publicUrl: resolveFallbackPublicUrl(requestHost),
            tablePrefix: SUPABASE_TABLE_PREFIX,
        };
    }

    const resolvedServer =
        resolveRegisteredServerByHost(requestHost, registeredServers) ||
        resolveRegisteredServerByHost(xPromptbookServer, registeredServers);

    if (!resolvedServer) {
        throw new Error(`Server with host "${requestHost}" is not registered in _Server`);
    }

    return {
        publicUrl: new URL(`https://${resolvedServer.domain}`),
        tablePrefix: resolvedServer.tablePrefix,
    };
}

/**
 * Builds the fallback public URL used before `_Server` is populated or for localhost requests.
 *
 * @param host - Current request host.
 * @returns Public URL for the fallback/default server.
 */
function resolveFallbackPublicUrl(host: string | null): URL {
    if (NEXT_PUBLIC_SITE_URL) {
        return NEXT_PUBLIC_SITE_URL;
    }

    return new URL(`https://${host || 'localhost:4440'}`);
}

/**
 * Checks whether the current request is a localhost-style development request.
 *
 * @param host - Raw request host.
 * @returns `true` when the host points to localhost or loopback.
 */
function isLocalDevelopmentHost(host: string | null): boolean {
    if (!host) {
        return false;
    }

    return host.startsWith('127.0.0.1') || host.startsWith('localhost');
}
