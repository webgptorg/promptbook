'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showAlert, showConfirm, showPrompt } from '../../../components/AsyncDialogs/asyncDialogs';
import type { ManagedServerDnsDiagnostic } from './ServersRegistryDnsTypes';
import { ServersRegistryApi } from './ServersRegistryApi';

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

    /**
     * Optional standalone-VPS DNS verification details for the domain.
     */
    readonly dnsDiagnostic?: ManagedServerDnsDiagnostic | null;
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
 * Result returned after asking the user to confirm current-server deletion.
 *
 * @private function of useServersRegistryState
 */
type DeleteCurrentServerConfirmationResult = {
    /**
     * Whether the current deletion request can continue.
     */
    readonly isConfirmed: boolean;

    /**
     * Optional validation error to show when the user reached the prompt flow but failed confirmation.
     */
    readonly errorMessage: string | null;
};

/**
 * Result returned by `useServersRegistryState`.
 *
 * @private function of <ServersClient/>
 */
type UseServersRegistryStateResult = {
    /**
     * Whether the current viewer can mutate server rows.
     */
    readonly canEdit: boolean;

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
     * Whether the registry rows are virtual standalone VPS domains.
     */
    readonly isStandaloneVps: boolean;

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
 * Builds editable drafts keyed by server id for the provided registry rows.
 *
 * @param servers - Persisted server rows.
 * @returns Draft record keyed by row id.
 *
 * @private function of useServersRegistryState
 */
function createServerDraftRecord(servers: ReadonlyArray<ManagedServerRow>): Record<number, ServerDraft> {
    return Object.fromEntries(servers.map((server) => [server.id, createServerDraftFromRow(server)]));
}

/**
 * Normalizes thrown values into the UI banner error format.
 *
 * @param error - Unknown thrown value.
 * @param fallbackMessage - Message used when the error is not an `Error`.
 * @returns Human-readable message for the page error banner.
 *
 * @private function of useServersRegistryState
 */
function resolveServersRegistryActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Shows the migration summary dialog after a successful migration run.
 *
 * @param payload - Migration summary returned by the API.
 * @returns Promise that settles even when the dialog is dismissed unexpectedly.
 *
 * @private function of useServersRegistryState
 */
async function showServerMigrationSummaryAlert(payload: {
    readonly appliedCount?: number;
    readonly totalMigrationFiles?: number;
}): Promise<void> {
    await showAlert({
        title: 'Server migrated',
        message: `Applied ${payload.appliedCount ?? 0} of ${payload.totalMigrationFiles ?? 0} migration files.`,
    }).catch(() => undefined);
}

/**
 * Runs the destructive confirmation flow required before deleting the current server.
 *
 * @param currentServer - Server currently resolved from the request domain.
 * @returns Confirmation outcome for the delete action.
 *
 * @private function of useServersRegistryState
 */
async function confirmCurrentServerDeletion(
    currentServer: ManagedServerRow,
): Promise<DeleteCurrentServerConfirmationResult> {
    const isDeleteConfirmed = await showConfirm({
        title: 'Delete this server',
        message: 'Are you sure you want to delete this server? This action cannot be undone.',
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
    }).catch(() => false);

    if (!isDeleteConfirmed) {
        return {
            isConfirmed: false,
            errorMessage: null,
        };
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
        return {
            isConfirmed: false,
            errorMessage: 'Server deletion cancelled because the confirmation name did not match.',
        };
    }

    return {
        isConfirmed: true,
        errorMessage: null,
    };
}

/**
 * Tracks editable drafts for the loaded registry rows and derives dirty-state selectors.
 *
 * @param servers - Persisted rows currently shown in the table.
 * @returns Editable drafts together with update and dirty-state helpers.
 *
 * @private function of useServersRegistryState
 */
function useServersRegistryDraftState(servers: ReadonlyArray<ManagedServerRow>) {
    const [serverDrafts, setServerDrafts] = useState<Record<number, ServerDraft>>({});

    const replaceServerDrafts = useCallback((nextServers: ReadonlyArray<ManagedServerRow>) => {
        setServerDrafts(createServerDraftRecord(nextServers));
    }, []);

    const updateServerDraft = useCallback<UpdateServerDraft>((serverId, fieldName, value) => {
        setServerDrafts((previousServerDrafts) => ({
            ...previousServerDrafts,
            [serverId]: {
                ...previousServerDrafts[serverId],
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

    return {
        hasDirtyServerDrafts,
        isServerDraftDirty,
        replaceServerDrafts,
        serverDrafts,
        updateServerDraft,
    };
}

/**
 * Creates the reload action that refreshes managed servers and resets the editable drafts.
 *
 * @param options - Stable state updaters used by the reload flow.
 * @returns Memoized loader for the managed-server registry.
 *
 * @private function of useServersRegistryState
 */
function useServersRegistryReloadAction(options: {
    readonly setIsStandaloneVps: (isStandaloneVps: boolean) => void;
    readonly replaceServerDrafts: (servers: ReadonlyArray<ManagedServerRow>) => void;
    readonly setCanEdit: (canEdit: boolean) => void;
    readonly setCurrentServerId: (currentServerId: number | null) => void;
    readonly setError: (error: string | null) => void;
    readonly setLoading: (isLoading: boolean) => void;
    readonly setServers: (servers: ManagedServerRow[]) => void;
}) {
    const {
        replaceServerDrafts,
        setCanEdit,
        setCurrentServerId,
        setError,
        setIsStandaloneVps,
        setLoading,
        setServers,
    } = options;

    return useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const payload = await ServersRegistryApi.fetchServers();
            setServers([...payload.servers]);
            setCurrentServerId(payload.currentServerId);
            setCanEdit(payload.canEdit);
            setIsStandaloneVps(payload.isStandaloneVps === true);
            replaceServerDrafts(payload.servers);
        } catch (loadError) {
            setError(resolveServersRegistryActionErrorMessage(loadError, 'Failed to load servers.'));
        } finally {
            setLoading(false);
        }
    }, [replaceServerDrafts, setCanEdit, setCurrentServerId, setError, setIsStandaloneVps, setLoading, setServers]);
}

/**
 * Creates the save action for one edited registry row.
 *
 * @param options - Data and state updaters used by the save flow.
 * @returns Memoized save callback for one server id.
 *
 * @private function of useServersRegistryState
 */
function useSaveServerAction(options: {
    readonly reloadServers: () => Promise<void>;
    readonly serverDrafts: Record<number, ServerDraft>;
    readonly setError: (error: string | null) => void;
    readonly setSavingServerId: (serverId: number | null) => void;
}) {
    const { reloadServers, serverDrafts, setError, setSavingServerId } = options;

    return useCallback(
        async (serverId: number) => {
            const draft = serverDrafts[serverId];
            if (!draft) {
                return;
            }

            try {
                setSavingServerId(serverId);
                setError(null);

                await ServersRegistryApi.saveServer(serverId, draft);
                await reloadServers();
            } catch (saveError) {
                setError(resolveServersRegistryActionErrorMessage(saveError, 'Failed to save the server.'));
            } finally {
                setSavingServerId(null);
            }
        },
        [reloadServers, serverDrafts, setError, setSavingServerId],
    );
}

/**
 * Creates the navigation action that opens the selected server on its own dashboard domain.
 *
 * @param options - State updaters used by the navigation flow.
 * @returns Memoized switch callback for one server row.
 *
 * @private function of useServersRegistryState
 */
function useSwitchToServerAction(options: {
    readonly setError: (error: string | null) => void;
    readonly setNavigatingServerId: (serverId: number | null) => void;
}) {
    const { setError, setNavigatingServerId } = options;

    return useCallback(
        async (server: ManagedServerRow) => {
            try {
                setNavigatingServerId(server.id);
                setError(null);
                window.location.assign(createServerDashboardUrl(server));
            } catch (switchError) {
                setError(resolveServersRegistryActionErrorMessage(switchError, 'Failed to switch to the server.'));
            } finally {
                setNavigatingServerId(null);
            }
        },
        [setError, setNavigatingServerId],
    );
}

/**
 * Creates the migration action for one registered server.
 *
 * @param options - State updaters used by the migration flow.
 * @returns Memoized migrate callback for one server id.
 *
 * @private function of useServersRegistryState
 */
function useMigrateServerAction(options: {
    readonly reloadServers: () => Promise<void>;
    readonly setError: (error: string | null) => void;
    readonly setMigratingServerId: (serverId: number | null) => void;
}) {
    const { reloadServers, setError, setMigratingServerId } = options;

    return useCallback(
        async (serverId: number) => {
            try {
                setMigratingServerId(serverId);
                setError(null);

                const payload = await ServersRegistryApi.migrateServer(serverId);
                await showServerMigrationSummaryAlert(payload);
                await reloadServers();
            } catch (migrationError) {
                setError(resolveServersRegistryActionErrorMessage(migrationError, 'Failed to run server migrations.'));
            } finally {
                setMigratingServerId(null);
            }
        },
        [reloadServers, setError, setMigratingServerId],
    );
}

/**
 * Creates the destructive delete action for the server resolved from the current domain.
 *
 * @param options - Current server data and state updaters used by the delete flow.
 * @returns Memoized delete callback for the current server.
 *
 * @private function of useServersRegistryState
 */
function useDeleteCurrentServerAction(options: {
    readonly currentServer: ManagedServerRow | null;
    readonly reloadServers: () => Promise<void>;
    readonly setDeletingServerId: (serverId: number | null) => void;
    readonly setError: (error: string | null) => void;
}) {
    const { currentServer, reloadServers, setDeletingServerId, setError } = options;

    return useCallback(
        async (deleteOptions?: DeleteCurrentServerOptions) => {
            if (!currentServer) {
                return;
            }

            const confirmation = await confirmCurrentServerDeletion(currentServer);
            if (!confirmation.isConfirmed) {
                if (confirmation.errorMessage) {
                    setError(confirmation.errorMessage);
                }
                return;
            }

            try {
                setDeletingServerId(currentServer.id);
                setError(null);

                const payload = await ServersRegistryApi.deleteServer(currentServer.id);
                if (payload.redirectUrl) {
                    deleteOptions?.onRedirect?.(payload.redirectUrl);
                    return;
                }

                await reloadServers();
            } catch (deleteError) {
                setError(
                    resolveServersRegistryActionErrorMessage(deleteError, 'Failed to delete the current server.'),
                );
            } finally {
                setDeletingServerId(null);
            }
        },
        [currentServer, reloadServers, setDeletingServerId, setError],
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
    const [canEdit, setCanEdit] = useState(false);
    const [isStandaloneVps, setIsStandaloneVps] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentServerId, setCurrentServerId] = useState<number | null>(null);
    const [savingServerId, setSavingServerId] = useState<number | null>(null);
    const [navigatingServerId, setNavigatingServerId] = useState<number | null>(null);
    const [migratingServerId, setMigratingServerId] = useState<number | null>(null);
    const [deletingServerId, setDeletingServerId] = useState<number | null>(null);
    const { hasDirtyServerDrafts, isServerDraftDirty, replaceServerDrafts, serverDrafts, updateServerDraft } =
        useServersRegistryDraftState(servers);

    const currentServer = useMemo(
        () => servers.find((server) => server.id === currentServerId) ?? null,
        [currentServerId, servers],
    );

    const reloadServers = useServersRegistryReloadAction({
        replaceServerDrafts,
        setCanEdit,
        setCurrentServerId,
        setError,
        setIsStandaloneVps,
        setLoading,
        setServers,
    });

    useEffect(() => {
        void reloadServers();
    }, [reloadServers]);

    const saveServer = useSaveServerAction({
        reloadServers,
        serverDrafts,
        setError,
        setSavingServerId,
    });

    const switchToServer = useSwitchToServerAction({
        setError,
        setNavigatingServerId,
    });

    const migrateServer = useMigrateServerAction({
        reloadServers,
        setError,
        setMigratingServerId,
    });

    const deleteCurrentServer = useDeleteCurrentServerAction({
        currentServer,
        reloadServers,
        setDeletingServerId,
        setError,
    });

    return {
        canEdit,
        currentServer,
        currentServerId,
        deletingServerId,
        deleteCurrentServer,
        error,
        hasDirtyServerDrafts,
        isServerDraftDirty,
        isStandaloneVps,
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
