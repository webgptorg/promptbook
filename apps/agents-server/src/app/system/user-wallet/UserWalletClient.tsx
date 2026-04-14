'use client';

import { WalletRecordDialog } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { GithubAppStatusResponse } from '@/src/utils/githubAppClient';
import { UserWalletCreateCard } from './UserWalletCreateCard';
import type { UserWalletAgentOption } from './UserWalletAgentOption';
import { UserWalletRecordsTable } from './UserWalletRecordsTable';
import { useUserWalletClientState } from './useUserWalletClientState';

export type { UserWalletAgentOption } from './UserWalletAgentOption';

/**
 * Props for the user-wallet client page.
 */
type UserWalletClientProps = {
    agents: Array<UserWalletAgentOption>;
};

/**
 * Resolves the human-readable GitHub App status summary.
 */
function resolveGithubAppStatusDescription(status: GithubAppStatusResponse | null): string {
    if (status?.isConfigured === true) {
        return status.isConnected
            ? 'Connected. USE PROJECT can obtain tokens automatically.'
            : 'Not connected yet. Connect once to enable automatic USE PROJECT tokens.';
    }

    return 'GitHub App is not configured on this server. You can still add tokens manually.';
}

/**
 * User wallet CRUD UI under System menu.
 */
export function UserWalletClient(props: UserWalletClientProps) {
    const { agents } = props;
    const state = useUserWalletClientState({ agents });

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            <h1 className="text-3xl font-bold mb-8">User Wallet</h1>

            {state.error && (
                <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">GitHub App</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {resolveGithubAppStatusDescription(state.githubAppStatus)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={state.openGithubConnectDialog}
                        disabled={state.githubAppStatus?.isConfigured !== true}
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Connect with GitHub
                    </button>
                </div>
            </div>

            <UserWalletCreateCard
                agents={agents}
                draft={state.newDraft}
                isSmtpRecord={state.isNewSmtpRecord}
                isSaving={state.saving}
                onApplyUseEmailSmtpTemplate={state.applyUseEmailSmtpTemplate}
                onSubmit={state.createRecord}
                updateDraft={state.updateNewDraft}
            />

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scope filter</label>
                        <select
                            value={state.filterScope}
                            onChange={(event) => state.setFilterScope(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All records</option>
                            <option value="GLOBAL">Records across all agents</option>
                            {agents.map((agent) => (
                                <option key={agent.permanentId} value={agent.permanentId}>
                                    {agent.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={state.search}
                                onChange={(event) => state.setSearch(event.target.value)}
                                placeholder="Search service, key, username..."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => void state.loadRecords()}
                                className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <UserWalletRecordsTable
                agents={agents}
                editingDraft={state.editingDraft}
                isEditingSmtpRecord={state.isEditingSmtpRecord}
                isLoading={state.loading}
                isSaving={state.saving}
                onCancelEditing={state.cancelEditing}
                onDeleteRecord={state.deleteRecord}
                onSaveEditingRecord={state.updateRecord}
                onStartEditing={state.startEditing}
                records={state.records}
                resolveScopeLabel={state.resolveScopeLabel}
                updateEditingDraft={state.updateEditingDraft}
            />

            <WalletRecordDialog
                isOpen={state.isGithubConnectDialogOpen}
                request={state.githubConnectWalletRequest}
                onSubmit={state.handleGithubConnectDialogSubmit}
                onClose={state.closeGithubConnectDialog}
                githubApp={{
                    isConfigured: state.githubAppStatus?.isConfigured === true,
                    agentPermanentId: state.newDraft.agentPermanentId,
                    returnTo: '/system/user-wallet',
                }}
            />
        </div>
    );
}
