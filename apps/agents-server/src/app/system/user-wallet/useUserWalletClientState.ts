'use client';

import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '@/src/utils/githubAppClient';
import type { UserWalletRecord } from '@/src/utils/userWallet';
import {
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from '@/src/utils/useProjectGithubWalletConstants';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { UserWalletAgentOption } from './UserWalletAgentOption';
import {
    applyUseEmailSmtpTemplateToUserWalletDraft,
    clearSensitiveUserWalletDraftFields,
    createEditingUserWalletDraft,
    createNewUserWalletDraft,
    createUserWalletRecordRequestPayload,
    isUseEmailSmtpAccessTokenRecord,
    resolveUserWalletScopeLabel,
    validateUserWalletDraft,
    type EditingUserWalletDraft,
    type UpdateUserWalletDraft,
    type UserWalletDraft,
} from './UserWalletDraft';

/**
 * Props for `useUserWalletClientState`.
 *
 * @private function of UserWalletClient
 */
type UseUserWalletClientStateProps = {
    agents: ReadonlyArray<UserWalletAgentOption>;
};

/**
 * Scope filter used by the user-wallet page.
 *
 * @private function of UserWalletClient
 */
type WalletFilterScope = 'ALL' | 'GLOBAL' | string;

/**
 * State and handlers consumed by `UserWalletClient`.
 *
 * @private function of UserWalletClient
 */
type UseUserWalletClientStateResult = {
    applyUseEmailSmtpTemplate: () => void;
    cancelEditing: () => void;
    closeGithubConnectDialog: () => void;
    createRecord: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    deleteRecord: (record: UserWalletRecord) => Promise<void>;
    editingDraft: EditingUserWalletDraft | null;
    error: string | null;
    filterScope: WalletFilterScope;
    githubAppStatus: GithubAppStatusResponse | null;
    githubConnectWalletRequest: PendingWalletRecordRequest;
    handleGithubConnectDialogSubmit: (payload: WalletRecordDialogSubmitPayload) => Promise<void>;
    isEditingSmtpRecord: boolean;
    isGithubConnectDialogOpen: boolean;
    isNewSmtpRecord: boolean;
    loadRecords: () => Promise<void>;
    loading: boolean;
    newDraft: UserWalletDraft;
    openGithubConnectDialog: () => void;
    records: UserWalletRecord[];
    resolveScopeLabel: (record: UserWalletRecord) => string;
    saving: boolean;
    search: string;
    setFilterScope: (value: WalletFilterScope) => void;
    setSearch: (value: string) => void;
    startEditing: (record: UserWalletRecord) => void;
    updateEditingDraft: UpdateUserWalletDraft;
    updateNewDraft: UpdateUserWalletDraft;
    updateRecord: () => Promise<void>;
};

/**
 * JSON error payload returned by wallet routes.
 */
type UserWalletApiErrorPayload = {
    error?: string;
};

type UserWalletRequestPayload = ReturnType<typeof createUserWalletRecordRequestPayload>;

/**
 * Builds the query used to load wallet records for the current filters.
 */
function createUserWalletRecordsQuery(filterScope: WalletFilterScope, search: string): URLSearchParams {
    const query = new URLSearchParams();

    if (search.trim()) {
        query.set('search', search.trim());
    }

    if (filterScope !== 'ALL' && filterScope !== 'GLOBAL') {
        query.set('agentPermanentId', filterScope);
        query.set('includeGlobal', 'true');
    }

    return query;
}

/**
 * Applies the special global-only table filter after records load.
 */
function filterUserWalletRecordsByScope(
    records: UserWalletRecord[],
    filterScope: WalletFilterScope,
): UserWalletRecord[] {
    return filterScope === 'GLOBAL'
        ? records.filter((record) => record.isGlobal)
        : records;
}

/**
 * Reads the API error message from one wallet response.
 */
async function readUserWalletApiErrorMessage(
    response: Response,
    fallbackMessage: string,
): Promise<string> {
    const payload = (await response.json().catch(() => ({}))) as UserWalletApiErrorPayload;
    return payload.error || fallbackMessage;
}

/**
 * Loads wallet records from the user-wallet API.
 */
async function fetchUserWalletRecords(options: {
    filterScope: WalletFilterScope;
    search: string;
}): Promise<UserWalletRecord[]> {
    const query = createUserWalletRecordsQuery(options.filterScope, options.search);
    const response = await fetch(`/api/user-wallet?${query.toString()}`);

    if (!response.ok) {
        throw new Error(await readUserWalletApiErrorMessage(response, 'Failed to load wallet records.'));
    }

    const records = (await response.json()) as UserWalletRecord[];
    return filterUserWalletRecordsByScope(records, options.filterScope);
}

/**
 * Persists a newly created wallet record.
 */
async function submitCreateUserWalletRecord(payload: UserWalletRequestPayload): Promise<void> {
    const response = await fetch('/api/user-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await readUserWalletApiErrorMessage(response, 'Failed to create wallet record.'));
    }
}

/**
 * Persists one updated wallet record.
 */
async function submitUpdateUserWalletRecord(
    walletId: number,
    payload: UserWalletRequestPayload,
): Promise<void> {
    const response = await fetch(`/api/user-wallet/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await readUserWalletApiErrorMessage(response, 'Failed to update wallet record.'));
    }
}

/**
 * Deletes one existing wallet record.
 */
async function submitDeleteUserWalletRecord(walletId: number): Promise<void> {
    const response = await fetch(`/api/user-wallet/${walletId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(await readUserWalletApiErrorMessage(response, 'Failed to delete wallet record.'));
    }
}

/**
 * Requests confirmation before deleting a wallet record.
 */
async function confirmUserWalletRecordDeletion(): Promise<boolean> {
    return showConfirm({
        title: 'Delete wallet record',
        message: 'Do you want to delete this wallet record?',
        confirmLabel: 'Delete record',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Resolves the agent scope used when the GitHub dialog submits a new wallet record.
 */
function resolveGithubConnectDialogAgentPermanentId(options: {
    defaultAgentPermanentId: string;
    payload: WalletRecordDialogSubmitPayload;
    selectedAgentPermanentId: string;
}): string | null {
    if (options.payload.isGlobal) {
        return null;
    }

    return options.selectedAgentPermanentId || options.defaultAgentPermanentId || '';
}

/**
 * Manages user-wallet loading, draft state, and CRUD actions.
 *
 * @private function of UserWalletClient
 */
export function useUserWalletClientState(
    props: UseUserWalletClientStateProps,
): UseUserWalletClientStateResult {
    const { agents } = props;
    const defaultAgentPermanentId = agents[0]?.permanentId || '';

    const [records, setRecords] = useState<UserWalletRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearchState] = useState('');
    const [filterScope, setFilterScopeState] = useState<WalletFilterScope>('ALL');
    const [newDraft, setNewDraft] = useState<UserWalletDraft>(() =>
        createNewUserWalletDraft(defaultAgentPermanentId),
    );
    const [editingDraft, setEditingDraft] = useState<EditingUserWalletDraft | null>(null);
    const [githubAppStatus, setGithubAppStatus] = useState<GithubAppStatusResponse | null>(null);
    const [isGithubConnectDialogOpen, setIsGithubConnectDialogOpen] = useState(false);

    const agentLabelByPermanentId = useMemo(() => {
        return new Map<string, string>(agents.map((agent) => [agent.permanentId, agent.label] as const));
    }, [agents]);

    const githubConnectWalletRequest = useMemo<PendingWalletRecordRequest>(
        () => ({
            marker: 'user-wallet-github-connect',
            sourceToolName: 'user-wallet',
            recordType: 'ACCESS_TOKEN',
            service: USE_PROJECT_GITHUB_WALLET_SERVICE,
            key: USE_PROJECT_GITHUB_WALLET_KEY,
            message:
                'Connect your GitHub App installation or add a manual token. This token is used by USE PROJECT.',
            isUserScoped: false,
            isGlobal: false,
        }),
        [],
    );

    const isNewSmtpRecord = useMemo(() => {
        return isUseEmailSmtpAccessTokenRecord(
            newDraft.recordType,
            newDraft.service,
            newDraft.key || 'default',
        );
    }, [newDraft]);

    const isEditingSmtpRecord = useMemo(() => {
        if (!editingDraft) {
            return false;
        }

        return isUseEmailSmtpAccessTokenRecord(
            editingDraft.recordType,
            editingDraft.service,
            editingDraft.key || 'default',
        );
    }, [editingDraft]);

    const updateNewDraft = useCallback<UpdateUserWalletDraft>((field, value) => {
        setNewDraft((currentDraft) => ({
            ...currentDraft,
            [field]: value,
        }));
    }, []);

    const updateEditingDraft = useCallback<UpdateUserWalletDraft>((field, value) => {
        setEditingDraft((currentDraft) => {
            if (!currentDraft) {
                return currentDraft;
            }

            return {
                ...currentDraft,
                [field]: value,
            };
        });
    }, []);

    const setSearch = useCallback((value: string) => {
        setSearchState(value);
    }, []);

    const setFilterScope = useCallback((value: WalletFilterScope) => {
        setFilterScopeState(value);
    }, []);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const loadedRecords = await fetchUserWalletRecords({
                filterScope,
                search,
            });
            setRecords(loadedRecords);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [filterScope, search]);

    const loadGithubAppConnectionStatus = useCallback(async () => {
        const status = await fetchGithubAppStatus();
        setGithubAppStatus(status);
    }, []);

    useEffect(() => {
        void loadRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterScope]);

    useEffect(() => {
        void loadGithubAppConnectionStatus();
    }, [loadGithubAppConnectionStatus]);

    const createRecord = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);

            const validationError = validateUserWalletDraft(newDraft);
            if (validationError) {
                setError(validationError);
                return;
            }

            setSaving(true);

            try {
                await submitCreateUserWalletRecord(createUserWalletRecordRequestPayload(newDraft));
                setNewDraft((currentDraft) => clearSensitiveUserWalletDraftFields(currentDraft));
                await loadRecords();
            } catch (createError) {
                setError(createError instanceof Error ? createError.message : 'Failed to create wallet record.');
            } finally {
                setSaving(false);
            }
        },
        [loadRecords, newDraft],
    );

    const openGithubConnectDialog = useCallback(() => {
        setIsGithubConnectDialogOpen(true);
    }, []);

    const closeGithubConnectDialog = useCallback(() => {
        setIsGithubConnectDialogOpen(false);
    }, []);

    const handleGithubConnectDialogSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            const resolvedAgentPermanentId = resolveGithubConnectDialogAgentPermanentId({
                defaultAgentPermanentId,
                payload,
                selectedAgentPermanentId: newDraft.agentPermanentId,
            });

            if (!payload.isGlobal && !resolvedAgentPermanentId) {
                throw new Error('Select an agent or disable agent scope.');
            }

            setSaving(true);
            setError(null);

            try {
                await submitCreateUserWalletRecord({
                    ...payload,
                    agentPermanentId: resolvedAgentPermanentId,
                    key: payload.key || 'default',
                });
                closeGithubConnectDialog();
                await loadRecords();
                await loadGithubAppConnectionStatus();
            } finally {
                setSaving(false);
            }
        },
        [
            closeGithubConnectDialog,
            defaultAgentPermanentId,
            loadGithubAppConnectionStatus,
            loadRecords,
            newDraft.agentPermanentId,
        ],
    );

    const applyUseEmailSmtpTemplate = useCallback(() => {
        setNewDraft((currentDraft) => applyUseEmailSmtpTemplateToUserWalletDraft(currentDraft));
    }, []);

    const startEditing = useCallback(
        (record: UserWalletRecord) => {
            setEditingDraft(createEditingUserWalletDraft(record, defaultAgentPermanentId));
        },
        [defaultAgentPermanentId],
    );

    const cancelEditing = useCallback(() => {
        setEditingDraft(null);
    }, []);

    const updateRecord = useCallback(async () => {
        if (!editingDraft) {
            return;
        }

        setError(null);

        const validationError = validateUserWalletDraft(editingDraft);
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);

        try {
            await submitUpdateUserWalletRecord(
                editingDraft.id,
                createUserWalletRecordRequestPayload(editingDraft),
            );
            cancelEditing();
            await loadRecords();
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update wallet record.');
        } finally {
            setSaving(false);
        }
    }, [cancelEditing, editingDraft, loadRecords]);

    const deleteRecord = useCallback(
        async (record: UserWalletRecord) => {
            const isConfirmed = await confirmUserWalletRecordDeletion();
            if (!isConfirmed) {
                return;
            }

            setSaving(true);
            setError(null);

            try {
                await submitDeleteUserWalletRecord(record.id);

                if (editingDraft?.id === record.id) {
                    cancelEditing();
                }

                await loadRecords();
            } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete wallet record.');
            } finally {
                setSaving(false);
            }
        },
        [cancelEditing, editingDraft, loadRecords],
    );

    const resolveScopeLabel = useCallback(
        (record: UserWalletRecord): string => {
            return resolveUserWalletScopeLabel(record, agentLabelByPermanentId);
        },
        [agentLabelByPermanentId],
    );

    return {
        applyUseEmailSmtpTemplate,
        cancelEditing,
        closeGithubConnectDialog,
        createRecord,
        deleteRecord,
        editingDraft,
        error,
        filterScope,
        githubAppStatus,
        githubConnectWalletRequest,
        handleGithubConnectDialogSubmit,
        isEditingSmtpRecord,
        isGithubConnectDialogOpen,
        isNewSmtpRecord,
        loadRecords,
        loading,
        newDraft,
        openGithubConnectDialog,
        records,
        resolveScopeLabel,
        saving,
        search,
        setFilterScope,
        setSearch,
        startEditing,
        updateEditingDraft,
        updateNewDraft,
        updateRecord,
    };
}
