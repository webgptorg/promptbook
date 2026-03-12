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
    /**
     * Optional same-instance override selected by the global admin.
     */
    readonly activeServerId?: number | null | undefined;
    /**
     * When true, the active-server override takes priority over host matching.
     */
    readonly allowOverride?: boolean;
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
     * Effective server used for the current request after applying the optional override.
     */
    readonly currentServer: ServerRecord | null;
    /**
     * Whether the effective server differs from the host-matched server.
     */
    readonly isOverridden: boolean;
};

/**
 * Resolves the effective same-instance server for one request.
 *
 * Host matching stays the default behavior, while the global-admin override can
 * temporarily point the whole request context to another registered server.
 *
 * @param options - Selection inputs for the current request.
 * @returns Host-matched and effective server records.
 */
export function resolveServerSelection(options: ResolveServerSelectionOptions): ResolvedServerSelection {
    const hostServer =
        resolveRegisteredServerByHost(options.host, options.registeredServers) ||
        resolveRegisteredServerByHost(options.forwardedServerHost, options.registeredServers);

    const overrideServer =
        options.allowOverride && typeof options.activeServerId === 'number'
            ? options.registeredServers.find((server) => server.id === options.activeServerId) || null
            : null;

    const currentServer = overrideServer || hostServer;

    return {
        hostServer,
        currentServer,
        isOverridden:
            currentServer !== null &&
            hostServer !== null &&
            currentServer.id !== hostServer.id,
    };
}
