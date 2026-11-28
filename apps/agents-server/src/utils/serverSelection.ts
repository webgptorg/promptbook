import type { ServerRecord } from './serverRegistry';
import { resolveRegisteredServerByHost } from './serverRegistry';

/**
 * Inputs used to resolve the effective same-instance server for one request.
 */
export type ResolveServerSelectionOptions = {
    /**
     * Request host header.
     */
    readonly host: string | null | undefined;
    /**
     * Optional forwarded server header used for custom-domain rewrites.
     */
    readonly forwardedServerHost?: string | null | undefined;
    /**
     * Registered servers available in the current deployment.
     */
    readonly registeredServers: ReadonlyArray<ServerRecord>;
};

/**
 * Result of resolving the host-selected and effective current server.
 */
export type ResolvedServerSelection = {
    /**
     * Server matched directly from the current request host or forwarded host.
     */
    readonly hostServer: ServerRecord | null;
    /**
     * Effective server used for the current request.
     */
    readonly currentServer: ServerRecord | null;
};

/**
 * Resolves the effective same-instance server for one request.
 *
 * The request host always determines the current server. Forwarded host
 * headers are used only for custom-domain rewrites.
 *
 * @param options - Selection inputs for the current request.
 * @returns Host-matched and effective server records.
 */
export function resolveServerSelection(options: ResolveServerSelectionOptions): ResolvedServerSelection {
    const hostServer =
        resolveRegisteredServerByHost(options.host, options.registeredServers) ||
        resolveRegisteredServerByHost(options.forwardedServerHost, options.registeredServers);

    return {
        hostServer,
        currentServer: hostServer,
    };
}
