import { readJsonResponse } from '../custom-resource/shared';
import type { ManagedServerRow, ServerDraft } from './useServersRegistryState';

/**
 * API payload returned by `GET /api/admin/servers`.
 *
 * @private function of useServersRegistryState
 */
type ManagedServersReadResponse = {
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
 * API payload returned by `PATCH /api/admin/servers/[serverId]`.
 *
 * @private function of useServersRegistryState
 */
type SaveManagedServerResponse = {
    /**
     * Optional failure message returned by the API.
     */
    readonly error?: string;
};

/**
 * API payload returned by `POST /api/admin/servers/[serverId]/migrate`.
 *
 * @private function of useServersRegistryState
 */
type MigrateManagedServerResponse = {
    /**
     * Optional failure message returned by the API.
     */
    readonly error?: string;

    /**
     * Number of migrations applied by the server.
     */
    readonly appliedCount?: number;

    /**
     * Number of migration files considered by the server.
     */
    readonly totalMigrationFiles?: number;
};

/**
 * API payload returned by `DELETE /api/admin/servers/[serverId]`.
 *
 * @private function of useServersRegistryState
 */
type DeleteManagedServerResponse = {
    /**
     * Optional failure message returned by the API.
     */
    readonly error?: string;

    /**
     * Optional redirect target returned after deleting the current server.
     */
    readonly redirectUrl?: string | null;
};

/**
 * Loads the managed-server registry from the admin API.
 *
 * @private function of useServersRegistryState
 */
async function fetchServers(): Promise<ManagedServersReadResponse> {
    const response = await fetch('/api/admin/servers');
    const payload = await readJsonResponse<ManagedServersReadResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load servers.');
    }

    return payload;
}

/**
 * Persists one edited managed-server row through the admin API.
 *
 * @private function of useServersRegistryState
 */
async function saveServer(serverId: number, draft: ServerDraft): Promise<void> {
    const response = await fetch(`/api/admin/servers/${serverId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
    });
    const payload = await readJsonResponse<SaveManagedServerResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save the server.');
    }
}

/**
 * Runs pending migrations for one managed server through the admin API.
 *
 * @private function of useServersRegistryState
 */
async function migrateServer(serverId: number): Promise<MigrateManagedServerResponse> {
    const response = await fetch(`/api/admin/servers/${serverId}/migrate`, {
        method: 'POST',
    });
    const payload = await readJsonResponse<MigrateManagedServerResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to run server migrations.');
    }

    return payload;
}

/**
 * Deletes one managed-server registration through the admin API.
 *
 * @private function of useServersRegistryState
 */
async function deleteServer(serverId: number): Promise<DeleteManagedServerResponse> {
    const response = await fetch(`/api/admin/servers/${serverId}`, {
        method: 'DELETE',
    });
    const payload = await readJsonResponse<DeleteManagedServerResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete the current server.');
    }

    return payload;
}

/**
 * Browser-side API helpers for the managed servers admin registry.
 *
 * @private function of useServersRegistryState
 */
export const ServersRegistryApi = {
    fetchServers,
    saveServer,
    migrateServer,
    deleteServer,
};
