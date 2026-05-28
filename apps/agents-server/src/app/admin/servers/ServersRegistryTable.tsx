'use client';

import { ArrowRightLeft, Loader2, RefreshCcw, Save } from 'lucide-react';
import moment from 'moment';
import {
    MANAGED_SERVER_ENVIRONMENT_OPTIONS,
    type ManagedServerEnvironment,
    type ManagedServerRow,
    type ServerDraft,
    type UpdateServerDraft,
} from './useServersRegistryState';

/**
 * Shared input class used across the editable server registry table.
 *
 * @private function of <ServersClient/>
 */
const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

/**
 * Shared secondary button styling used by the registry table.
 *
 * @private function of <ServersClient/>
 */
const SECONDARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Shared primary button styling used by the registry table.
 *
 * @private function of <ServersClient/>
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Props consumed by `ServersRegistryTable`.
 *
 * @private function of <ServersClient/>
 */
type ServersRegistryTableProps = {
    /**
     * Whether the viewer can edit server rows.
     */
    readonly canEdit: boolean;

    /**
     * Identifier of the server resolved from the current request domain.
     */
    readonly currentServerId: number | null;

    /**
     * Whether the server list is loading.
     */
    readonly loading: boolean;

    /**
     * Whether rows are standalone VPS domains instead of database `_Server` records.
     */
    readonly isStandaloneVps: boolean;

    /**
     * Server id currently running migrations.
     */
    readonly migratingServerId: number | null;

    /**
     * Server id currently navigating away.
     */
    readonly navigatingServerId: number | null;

    /**
     * Server id currently being saved.
     */
    readonly savingServerId: number | null;

    /**
     * Editable drafts keyed by server id.
     */
    readonly serverDrafts: Record<number, ServerDraft>;

    /**
     * Registered servers rendered in the table.
     */
    readonly servers: ReadonlyArray<ManagedServerRow>;

    /**
     * Whether the provided server row contains unsaved changes.
     */
    readonly isServerDraftDirty: (server: ManagedServerRow) => boolean;

    /**
     * Runs pending migrations for one server.
     */
    readonly onMigrateServer: (serverId: number) => Promise<void>;

    /**
     * Persists one edited server row.
     */
    readonly onSaveServer: (serverId: number) => Promise<void>;

    /**
     * Navigates to the selected server dashboard.
     */
    readonly onSwitchServer: (server: ManagedServerRow) => Promise<void>;

    /**
     * Updates one editable draft field.
     */
    readonly onUpdateServerDraft: UpdateServerDraft;
};

/**
 * Props consumed by the private registry row helper.
 *
 * @private function of <ServersClient/>
 */
type ServersRegistryTableRowProps = {
    readonly canEdit: boolean;
    readonly currentServerId: number | null;
    readonly draft: ServerDraft | undefined;
    readonly isDirty: boolean;
    readonly isStandaloneVps: boolean;
    readonly isMigrating: boolean;
    readonly isNavigating: boolean;
    readonly isSaving: boolean;
    readonly onMigrateServer: (serverId: number) => Promise<void>;
    readonly onSaveServer: (serverId: number) => Promise<void>;
    readonly onSwitchServer: (server: ManagedServerRow) => Promise<void>;
    readonly onUpdateServerDraft: UpdateServerDraft;
    readonly server: ManagedServerRow;
};

/**
 * Formats an ISO timestamp into a compact local string.
 *
 * @param value - ISO timestamp.
 * @returns Human-readable local timestamp.
 */
function formatDateTime(value: string): string {
    if (!value) {
        return 'N/A';
    }

    const timestamp = moment(value);
    return timestamp.isValid() ? timestamp.format('YYYY-MM-DD HH:mm:ss') : 'N/A';
}

/**
 * Renders a small status badge used in the servers table.
 *
 * @param props - Badge label and tone.
 * @returns Badge element.
 */
function ServerStatusBadge(props: { readonly label: string; readonly tone: 'blue' | 'amber' | 'green' | 'gray' }) {
    const className =
        props.tone === 'blue'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : props.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : props.tone === 'green'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-gray-50 text-gray-600';

    return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{props.label}</span>;
}

/**
 * Renders one editable row in the managed-server registry table.
 *
 * @param props - Row props.
 * @returns Table row with editable fields and actions.
 */
function ServersRegistryTableRow(props: ServersRegistryTableRowProps) {
    const {
        currentServerId,
        canEdit,
        draft,
        isDirty,
        isStandaloneVps,
        isMigrating,
        isNavigating,
        isSaving,
        onMigrateServer,
        onSaveServer,
        onSwitchServer,
        onUpdateServerDraft,
        server,
    } = props;
    const isCurrent = server.id === currentServerId;

    return (
        <tr className={isCurrent ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
            <td className="px-4 py-3 align-top">
                <input
                    type="text"
                    value={draft?.name || ''}
                    onChange={(event) => onUpdateServerDraft(server.id, 'name', event.target.value)}
                    className={INPUT_CLASS_NAME}
                    disabled={!canEdit}
                    aria-label={`Server name for ${server.name}`}
                />
            </td>
            {!isStandaloneVps ? (
                <td className="px-4 py-3 align-top">
                    <select
                        value={draft?.environment || server.environment}
                        onChange={(event) =>
                            onUpdateServerDraft(
                                server.id,
                                'environment',
                                event.target.value as ManagedServerEnvironment,
                            )
                        }
                        className={INPUT_CLASS_NAME}
                        disabled={!canEdit}
                        aria-label={`Environment for ${server.name}`}
                    >
                        {MANAGED_SERVER_ENVIRONMENT_OPTIONS.map((environment) => (
                            <option key={environment} value={environment}>
                                {environment}
                            </option>
                        ))}
                    </select>
                </td>
            ) : null}
            <td className="px-4 py-3 align-top">
                <input
                    type="text"
                    value={draft?.domain || ''}
                    onChange={(event) => onUpdateServerDraft(server.id, 'domain', event.target.value)}
                    className={INPUT_CLASS_NAME}
                    disabled={!canEdit}
                    aria-label={`Domain for ${server.name}`}
                />
            </td>
            {!isStandaloneVps ? (
                <td className="px-4 py-3 align-top">
                    <input
                        type="text"
                        value={draft?.tablePrefix || ''}
                        onChange={(event) => onUpdateServerDraft(server.id, 'tablePrefix', event.target.value)}
                        className={`${INPUT_CLASS_NAME} font-mono`}
                        disabled={!canEdit}
                        aria-label={`Table prefix for ${server.name}`}
                    />
                </td>
            ) : null}
            <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-2">
                    {isCurrent ? <ServerStatusBadge label="Current" tone="green" /> : null}
                    {isDirty ? <ServerStatusBadge label="Unsaved" tone="blue" /> : null}
                    {!isCurrent && !isDirty ? <span className="text-xs text-gray-400">-</span> : null}
                </div>
            </td>
            <td className="px-4 py-3 align-top text-xs text-gray-600">
                <span className="whitespace-nowrap font-mono">{formatDateTime(server.createdAt)}</span>
            </td>
            <td className="px-4 py-3 align-top text-xs text-gray-600">
                <span className="whitespace-nowrap font-mono">{formatDateTime(server.updatedAt)}</span>
            </td>
            <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => void onSaveServer(server.id)}
                        disabled={!canEdit || !isDirty || isSaving}
                        className={`${PRIMARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                    >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => void onMigrateServer(server.id)}
                        disabled={!canEdit || isMigrating}
                        className={`${SECONDARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                    >
                        {isMigrating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        Migrate
                    </button>
                    <button
                        type="button"
                        onClick={() => void onSwitchServer(server)}
                        disabled={isNavigating}
                        className={`${SECONDARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                    >
                        {isNavigating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                        )}
                        Switch
                    </button>
                </div>
            </td>
        </tr>
    );
}

/**
 * Renders the editable registry table for all same-instance managed servers.
 *
 * @param props - Table props.
 * @returns Table with loading, empty, and editable row states.
 *
 * @private helper component of <ServersClient/>
 */
export function ServersRegistryTable(props: ServersRegistryTableProps) {
    const {
        currentServerId,
        canEdit,
        isStandaloneVps,
        isServerDraftDirty,
        loading,
        migratingServerId,
        navigatingServerId,
        onMigrateServer,
        onSaveServer,
        onSwitchServer,
        onUpdateServerDraft,
        savingServerId,
        serverDrafts,
        servers,
    } = props;

    return (
        <>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Registered servers</h2>
                </div>
                {loading ? <span className="text-xs font-medium text-blue-600">Refreshing…</span> : null}
            </div>

            {loading && servers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading registered servers…</div>
            ) : servers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">No registered servers found yet.</div>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                        {isStandaloneVps ? (
                            <colgroup>
                                <col className="w-[16rem]" />
                                <col className="w-[18rem]" />
                                <col className="w-[10rem]" />
                                <col className="w-[11rem]" />
                                <col className="w-[11rem]" />
                                <col className="w-[12rem]" />
                            </colgroup>
                        ) : (
                            <colgroup>
                                <col className="w-[16rem]" />
                                <col className="w-[10rem]" />
                                <col className="w-[18rem]" />
                                <col className="w-[13rem]" />
                                <col className="w-[10rem]" />
                                <col className="w-[11rem]" />
                                <col className="w-[11rem]" />
                                <col className="w-[12rem]" />
                            </colgroup>
                        )}
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Name</th>
                                {!isStandaloneVps ? (
                                    <th className="px-4 py-3 text-left font-semibold">Environment</th>
                                ) : null}
                                <th className="px-4 py-3 text-left font-semibold">Domain</th>
                                {!isStandaloneVps ? (
                                    <th className="px-4 py-3 text-left font-semibold">Table prefix</th>
                                ) : null}
                                <th className="px-4 py-3 text-left font-semibold">Status</th>
                                <th className="px-4 py-3 text-left font-semibold">Created</th>
                                <th className="px-4 py-3 text-left font-semibold">Updated</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {servers.map((server) => (
                                <ServersRegistryTableRow
                                    key={server.id}
                                    currentServerId={currentServerId}
                                    canEdit={canEdit}
                                    draft={serverDrafts[server.id]}
                                    isDirty={isServerDraftDirty(server)}
                                    isStandaloneVps={isStandaloneVps}
                                    isMigrating={migratingServerId === server.id}
                                    isNavigating={navigatingServerId === server.id}
                                    isSaving={savingServerId === server.id}
                                    onMigrateServer={onMigrateServer}
                                    onSaveServer={onSaveServer}
                                    onSwitchServer={onSwitchServer}
                                    onUpdateServerDraft={onUpdateServerDraft}
                                    server={server}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
