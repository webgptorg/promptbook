'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showAlert, showConfirm, showPrompt } from '../../../components/AsyncDialogs/asyncDialogs';

/**
 * Supported managed server environment groups.
 *
 * @private function of <ServersClient/>
 */
export type ManagedServerEnvironment = 'LTS' | 'PRODUCTION' | 'PREVIEW' | 'LIVE';

/**
 * Ordered environment options rendered in the servers admin UI.
 *
 * @private function of <ServersClient/>
 */
export const MANAGED_SERVER_ENVIRONMENT_OPTIONS: ReadonlyArray<ManagedServerEnvironment> = [
    'LIVE',
    'PREVIEW',
    'PRODUCTION',
    'LTS',
] as const;

/**
 * Server registry row returned by the admin servers API.
 *
 * @private function of <ServersClient/>
 */
export type ManagedServerRow = {
    /**
     * Database identifier.
     */
    readonly id: number;

    /**
     * Friendly unique server name.
     */
    readonly name: string;

    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ManagedServerEnvironment;

    /**
     * Public domain assigned to the server.
     */
    readonly domain: string;

    /**
     * Prefix used by the server-specific tables.
     */
    readonly tablePrefix: string;

    /**
     * Creation timestamp.
     */
    readonly createdAt: string;

    /**
     * Last update timestamp.
     */
    readonly updatedAt: string;
};

/**
 * Editable draft state for one registry row.
 *
 * @private function of <ServersClient/>
 */
export type ServerDraft = {
    /**
     * Friendly unique server name.
     */
    name: string;

    /**
     * Environment group used by migrations and operations.
     */
    environment: ManagedServerEnvironment;

    /**
     * Public domain assigned to the server.
     */
    domain: string;

    /**
     * Prefix used by the server-specific tables.
     */
    tablePrefix: string;
};

/**
 * Draft-field updater shared with the editable registry table.
 *
 * @private function of <ServersClient/>
 */
export type UpdateServerDraft = <TFieldName extends keyof ServerDraft>(
    serverId: number,
    fieldName: TFieldName,
    value: ServerDraft[TFieldName],
) => void;

/**
 * API payload returned by `GET /api/admin/servers`.
 *
 * @private function of <ServersClient/>
 */
type ManagedServersResponse = {
    /**
     * Registered servers ordered by name.
     */
    readonly servers: ReadonlyArray<ManagedServerRow>;

    /**
     * Server resolved from the current request domain.
     */
    readonly currentServerId: number | null;

    /**
     * Optional failure message returned by the API.
     */
    readonly error?: string;
};

/**
 * Redirect handler used after deleting the current server.
 *
 * @private function of <ServersClient/>
 */
type DeleteCurrentServerOptions = {
    /**
     * Called when the server deletion responds with a redirect target.
     */
    readonly onRedirect?: (redirectUrl: string) => void;
};

/**
 * Result returned by `useServersRegistryState`.
 *
 * @private function of <ServersClient/>
 */
type UseServersRegistryStateResult = {
    /**
     * Server resolved from the current request domain.
     */
    readonly currentServer: ManagedServerRow | null;

    /**
     * Identifier of the current server.
     */
    readonly currentServerId: number | null;

    /**
     * Server id currently being deleted.
     */
    readonly deletingServerId: number | null;

    /**
     * Current top-level error message.
     */
    readonly error: string | null;

    /**
     * Whether any editable server row differs from its persisted value.
     */
    readonly hasDirtyServerDrafts: boolean;

    /**
     * Whether one server row contains unsaved edits.
     */
    readonly isServerDraftDirty: (server: ManagedServerRow) => boolean;

    /**
     * Whether the registry list is loading.
     */
    readonly loading: boolean;

    /**
     * Server id currently running migrations.
     */
    readonly migratingServerId: number | null;

    /**
     * Server id currently navigating to its dashboard.
     */
    readonly navigatingServerId: number | null;

    /**
     * Reloads the current registry rows from the API.
     */
    readonly reloadServers: () => Promise<void>;

    /**
     * Server id currently being persisted.
     */
    readonly savingServerId: number | null;

    /**
     * Editable drafts keyed by server id.
     */
    readonly serverDrafts: Record<number, ServerDraft>;

    /**
     * Registered servers visible to the admin.
     */
    readonly servers: ManagedServerRow[];

    /**
     * Deletes the current server registration after confirmations.
     */
    readonly deleteCurrentServer: (options?: DeleteCurrentServerOptions) => Promise<void>;

    /**
     * Runs pending migrations for one server.
     */
    readonly migrateServer: (serverId: number) => Promise<void>;

    /**
     * Persists one edited server row.
     */
    readonly saveServer: (serverId: number) => Promise<void>;

    /**
     * Navigates to the selected server on its own domain dashboard.
     */
    readonly switchToServer: (server: ManagedServerRow) => Promise<void>;

    /**
     * Updates one editable draft field.
     */
    readonly updateServerDraft: UpdateServerDraft;
};

/**
 * Builds a public base URL for one managed server row.
 *
 * @param server - Registry row to resolve.
 * @returns Public URL string.
 */
function createServerPublicUrl(server: Pick<ManagedServerRow, 'domain'>): string {
    const protocol = server.domain.startsWith('localhost') || server.domain.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${server.domain}`;
}

/**
 * Builds the dashboard URL for one managed server row.
 *
 * @param server - Registry row to open.
 * @returns Dashboard URL string.
 */
function createServerDashboardUrl(server: Pick<ManagedServerRow, 'domain'>): string {
    return new URL('/dashboard', createServerPublicUrl(server)).href;
}

/**
 * Clones one persisted server row into an editable draft.
 *
 * @param server - Persisted registry row.
 * @returns Editable draft state.
 */
function createServerDraftFromRow(server: ManagedServerRow): ServerDraft {
    return {
        name: server.name,
        environment: server.environment,
        domain: server.domain,
        tablePrefix: server.tablePrefix,
    };
}

/**
 * Returns whether one draft differs from its persisted server row.
 *
 * @param server - Persisted registry row.
 * @param draft - Editable row draft.
 * @returns `true` when the draft contains unsaved changes.
 */
function isServerDraftDifferent(server: ManagedServerRow, draft: ServerDraft | undefined): boolean {
    if (!draft) {
        return false;
    }

    return (
        draft.name !== server.name ||
        draft.environment !== server.environment ||
        draft.domain !== server.domain ||
        draft.tablePrefix !== server.tablePrefix
    );
}

/**
 * Encapsulates the editable managed-server registry state and persistence flows.
 *
 * @returns Registry rows, edit drafts, and admin actions.
 *
 * @private internal hook of <ServersClient/>
 */
export function useServersRegistryState(): UseServersRegistryStateResult {
    const [servers, setServers] = useState<ManagedServerRow[]>([]);
    const [serverDrafts, setServerDrafts] = useState<Record<number, ServerDraft>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentServerId, setCurrentServerId] = useState<number | null>(null);
    const [savingServerId, setSavingServerId] = useState<number | null>(null);
    const [navigatingServerId, setNavigatingServerId] = useState<number | null>(null);
    const [migratingServerId, setMigratingServerId] = useState<number | null>(null);
    const [deletingServerId, setDeletingServerId] = useState<number | null>(null);

    const currentServer = useMemo(
        () => servers.find((server) => server.id === currentServerId) ?? null,
        [currentServerId, servers],
    );

    const reloadServers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/servers');
            const payload = (await response.json()) as ManagedServersResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load servers.');
            }

            setServers([...payload.servers]);
            setCurrentServerId(payload.currentServerId);
            setServerDrafts(
                Object.fromEntries(payload.servers.map((server) => [server.id, createServerDraftFromRow(server)])),
            );
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load servers.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reloadServers();
    }, [reloadServers]);

    const updateServerDraft = useCallback<UpdateServerDraft>((serverId, fieldName, value) => {
        setServerDrafts((previous) => ({
            ...previous,
            [serverId]: {
                ...previous[serverId],
                [fieldName]: value,
            },
        }));
    }, []);

    const isServerDraftDirty = useCallback(
        (server: ManagedServerRow): boolean => isServerDraftDifferent(server, serverDrafts[server.id]),
        [serverDrafts],
    );

    const hasDirtyServerDrafts = useMemo(
        () => servers.some((server) => isServerDraftDifferent(server, serverDrafts[server.id])),
        [serverDrafts, servers],
    );

    const saveServer = useCallback(
        async (serverId: number) => {
            const draft = serverDrafts[serverId];
            if (!draft) {
                return;
            }

            try {
                setSavingServerId(serverId);
                setError(null);

                const response = await fetch(`/api/admin/servers/${serverId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(draft),
                });
                const payload = (await response.json()) as { error?: string };

                if (!response.ok) {
                    throw new Error(payload.error || 'Failed to save the server.');
                }

                await reloadServers();
            } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : 'Failed to save the server.');
            } finally {
                setSavingServerId(null);
            }
        },
        [reloadServers, serverDrafts],
    );

    const switchToServer = useCallback(async (server: ManagedServerRow) => {
        try {
            setNavigatingServerId(server.id);
            setError(null);
            window.location.assign(createServerDashboardUrl(server));
        } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : 'Failed to switch to the server.');
        } finally {
            setNavigatingServerId(null);
        }
    }, []);

    const migrateServer = useCallback(
        async (serverId: number) => {
            try {
                setMigratingServerId(serverId);
                setError(null);

                const response = await fetch(`/api/admin/servers/${serverId}/migrate`, {
                    method: 'POST',
                });
                const payload = (await response.json()) as {
                    error?: string;
                    appliedCount?: number;
                    totalMigrationFiles?: number;
                };

                if (!response.ok) {
                    throw new Error(payload.error || 'Failed to run server migrations.');
                }

                await showAlert({
                    title: 'Server migrated',
                    message: `Applied ${payload.appliedCount ?? 0} of ${
                        payload.totalMigrationFiles ?? 0
                    } migration files.`,
                }).catch(() => undefined);
                await reloadServers();
            } catch (migrationError) {
                setError(migrationError instanceof Error ? migrationError.message : 'Failed to run server migrations.');
            } finally {
                setMigratingServerId(null);
            }
        },
        [reloadServers],
    );

    const deleteCurrentServer = useCallback(
        async (options?: DeleteCurrentServerOptions) => {
            if (!currentServer) {
                return;
            }

            const confirmed = await showConfirm({
                title: 'Delete this server',
                message: 'Are you sure you want to delete this server? This action cannot be undone.',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            const typedName = await showPrompt({
                title: 'Type the server name',
                message: `Type \`${currentServer.name}\` to confirm deleting this server. Existing server data will stay untouched.`,
                confirmLabel: 'Delete this server',
                cancelLabel: 'Cancel',
                inputLabel: 'Server name confirmation',
                placeholder: currentServer.name,
            }).catch(() => '');

            if (typedName.trim() !== currentServer.name) {
                setError('Server deletion cancelled because the confirmation name did not match.');
                return;
            }

            try {
                setDeletingServerId(currentServer.id);
                setError(null);

                const response = await fetch(`/api/admin/servers/${currentServer.id}`, {
                    method: 'DELETE',
                });
                const payload = (await response.json()) as { error?: string; redirectUrl?: string | null };

                if (!response.ok) {
                    throw new Error(payload.error || 'Failed to delete the current server.');
                }

                if (payload.redirectUrl) {
                    options?.onRedirect?.(payload.redirectUrl);
                    return;
                }

                await reloadServers();
            } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete the current server.');
            } finally {
                setDeletingServerId(null);
            }
        },
        [currentServer, reloadServers],
    );

    return {
        currentServer,
        currentServerId,
        deletingServerId,
        deleteCurrentServer,
        error,
        hasDirtyServerDrafts,
        isServerDraftDirty,
        loading,
        migrateServer,
        migratingServerId,
        navigatingServerId,
        reloadServers,
        saveServer,
        savingServerId,
        serverDrafts,
        servers,
        switchToServer,
        updateServerDraft,
    };
}
