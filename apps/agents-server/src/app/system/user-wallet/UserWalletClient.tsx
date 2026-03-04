'use client';

import { WalletRecordDialog, type PendingWalletRecordRequest, type WalletRecordDialogSubmitPayload } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';
import { SecretTextarea } from '@/src/components/SecretTextarea/SecretTextarea';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '@/src/utils/githubAppClient';
import {
    USE_EMAIL_SMTP_WALLET_KEY,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_SCHEMA,
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from '@/src/utils/useEmailSmtpWalletConstants';
import {
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from '@/src/utils/useProjectGithubWalletConstants';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Agent option used by user-wallet UI.
 */
export type UserWalletAgentOption = {
    permanentId: string;
    agentName: string;
    label: string;
};

/**
 * Wallet record type.
 */
type WalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * User wallet API record.
 */
type UserWalletEntry = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    agentPermanentId: string | null;
    recordType: WalletRecordType;
    service: string;
    key: string;
    jsonSchema: unknown | null;
    username: string | null;
    password: string | null;
    secret: string | null;
    cookies: string | null;
    isGlobal: boolean;
};

/**
 * Filter scope used by user-wallet UI.
 */
type WalletFilterScope = 'ALL' | 'GLOBAL' | string;

/**
 * Props for the user-wallet client page.
 */
type UserWalletClientProps = {
    agents: Array<UserWalletAgentOption>;
};

/**
 * Validation payload for one wallet record form.
 */
type WalletRecordValidationOptions = {
    recordType: WalletRecordType;
    service: string;
    username: string;
    password: string;
    secret: string;
    cookies: string;
    isGlobal: boolean;
    agentPermanentId: string;
    jsonSchemaText: string;
};

/**
 * Pre-formatted SMTP schema text for wallet forms.
 */
const USE_EMAIL_SMTP_WALLET_SCHEMA_TEXT = formatWalletJsonSchemaForTextarea(USE_EMAIL_SMTP_WALLET_SECRET_JSON_SCHEMA);

/**
 * Returns true when record identity matches USE EMAIL SMTP credentials.
 */
function isUseEmailSmtpAccessTokenRecord(recordType: WalletRecordType, service: string, key: string): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_EMAIL_SMTP_WALLET_SERVICE &&
        key.trim() === USE_EMAIL_SMTP_WALLET_KEY
    );
}

/**
 * Converts one wallet JSON schema object into pretty-printed text.
 */
function formatWalletJsonSchemaForTextarea(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return '';
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}

/**
 * Parses optional wallet JSON schema text into object payload.
 */
function parseWalletJsonSchemaFromTextarea(value: string): unknown | undefined {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return undefined;
    }

    let parsedValue: unknown;
    try {
        parsedValue = JSON.parse(trimmedValue);
    } catch {
        throw new Error('JSON schema must be valid JSON.');
    }

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error('JSON schema must be a JSON object.');
    }

    return parsedValue;
}

/**
 * User wallet CRUD UI under System menu.
 */
export function UserWalletClient(props: UserWalletClientProps) {
    const { agents } = props;
    const [records, setRecords] = useState<UserWalletEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterScope, setFilterScope] = useState<WalletFilterScope>('ALL');

    const [newRecordType, setNewRecordType] = useState<WalletRecordType>('ACCESS_TOKEN');
    const [newService, setNewService] = useState('github');
    const [newKey, setNewKey] = useState('default');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newSecret, setNewSecret] = useState('');
    const [newCookies, setNewCookies] = useState('');
    const [newJsonSchemaText, setNewJsonSchemaText] = useState('');
    const [newIsGlobal, setNewIsGlobal] = useState(false);
    const [newAgentPermanentId, setNewAgentPermanentId] = useState(agents[0]?.permanentId || '');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingRecordType, setEditingRecordType] = useState<WalletRecordType>('ACCESS_TOKEN');
    const [editingService, setEditingService] = useState('');
    const [editingKey, setEditingKey] = useState('');
    const [editingUsername, setEditingUsername] = useState('');
    const [editingPassword, setEditingPassword] = useState('');
    const [editingSecret, setEditingSecret] = useState('');
    const [editingCookies, setEditingCookies] = useState('');
    const [editingJsonSchemaText, setEditingJsonSchemaText] = useState('');
    const [editingIsGlobal, setEditingIsGlobal] = useState(false);
    const [editingAgentPermanentId, setEditingAgentPermanentId] = useState('');
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
            isGlobal: true,
        }),
        [],
    );
    const isNewSmtpRecord = useMemo(
        () => isUseEmailSmtpAccessTokenRecord(newRecordType, newService, newKey || 'default'),
        [newKey, newRecordType, newService],
    );
    const isEditingSmtpRecord = useMemo(
        () => isUseEmailSmtpAccessTokenRecord(editingRecordType, editingService, editingKey || 'default'),
        [editingKey, editingRecordType, editingService],
    );

    /**
     * Loads wallet records from API for selected scope and search query.
     */
    const loadRecords = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams();
            if (search.trim()) {
                query.set('search', search.trim());
            }

            if (filterScope !== 'ALL' && filterScope !== 'GLOBAL') {
                query.set('agentPermanentId', filterScope);
                query.set('includeGlobal', 'true');
            }

            const response = await fetch(`/api/user-wallet?${query.toString()}`);
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to load wallet records.');
            }

            const data = (await response.json()) as UserWalletEntry[];
            const filtered = filterScope === 'GLOBAL' ? data.filter((record) => record.isGlobal) : data;
            setRecords(filtered);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [filterScope, search]);

    /**
     * Loads GitHub App connect status for the current wallet user.
     */
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

    /**
     * Validates wallet form payload before submission.
     */
    const validateRecordPayload = (options: WalletRecordValidationOptions): string | null => {
        if (!options.service.trim()) {
            return 'Service is required.';
        }
        if (!options.isGlobal && !options.agentPermanentId) {
            return 'Select an agent or switch to global scope.';
        }
        if (options.recordType === 'USERNAME_PASSWORD' && (!options.username.trim() || !options.password.trim())) {
            return 'Username and password are required.';
        }
        if (options.recordType === 'SESSION_COOKIE' && !options.cookies.trim()) {
            return 'Cookies are required.';
        }
        if (options.recordType === 'ACCESS_TOKEN' && !options.secret.trim()) {
            return 'Secret is required.';
        }
        try {
            parseWalletJsonSchemaFromTextarea(options.jsonSchemaText);
        } catch (validationError) {
            return validationError instanceof Error ? validationError.message : 'Invalid JSON schema.';
        }
        return null;
    };

    /**
     * Creates one wallet record via API.
     */
    const createWalletRecord = useCallback(
        async (payload: WalletRecordDialogSubmitPayload & { agentPermanentId: string | null }) => {
            const response = await fetch('/api/user-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordType: payload.recordType,
                    service: payload.service,
                    key: payload.key || 'default',
                    jsonSchema: payload.jsonSchema,
                    username: payload.recordType === 'USERNAME_PASSWORD' ? payload.username : undefined,
                    password: payload.recordType === 'USERNAME_PASSWORD' ? payload.password : undefined,
                    secret: payload.recordType === 'ACCESS_TOKEN' ? payload.secret : undefined,
                    cookies: payload.recordType === 'SESSION_COOKIE' ? payload.cookies : undefined,
                    isGlobal: payload.isGlobal,
                    agentPermanentId: payload.isGlobal ? null : payload.agentPermanentId,
                }),
            });

            if (!response.ok) {
                const responsePayload = await response.json().catch(() => ({}));
                throw new Error(responsePayload.error || 'Failed to create wallet record.');
            }
        },
        [],
    );

    /**
     * Submits a new wallet record.
     */
    const createRecord = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        const validationError = validateRecordPayload({
            recordType: newRecordType,
            service: newService,
            username: newUsername,
            password: newPassword,
            secret: newSecret,
            cookies: newCookies,
            isGlobal: newIsGlobal,
            agentPermanentId: newAgentPermanentId,
            jsonSchemaText: newJsonSchemaText,
        });
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        try {
            const parsedJsonSchema = parseWalletJsonSchemaFromTextarea(newJsonSchemaText);
            await createWalletRecord({
                recordType: newRecordType,
                service: newService,
                key: newKey || 'default',
                jsonSchema: parsedJsonSchema,
                username: newRecordType === 'USERNAME_PASSWORD' ? newUsername : undefined,
                password: newRecordType === 'USERNAME_PASSWORD' ? newPassword : undefined,
                secret: newRecordType === 'ACCESS_TOKEN' ? newSecret : undefined,
                cookies: newRecordType === 'SESSION_COOKIE' ? newCookies : undefined,
                isGlobal: newIsGlobal,
                agentPermanentId: newIsGlobal ? null : newAgentPermanentId,
            });

            setNewUsername('');
            setNewPassword('');
            setNewSecret('');
            setNewCookies('');
            await loadRecords();
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : 'Failed to create wallet record.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Handles wallet record submission from the shared GitHub connect dialog.
     */
    const handleGithubConnectDialogSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            const resolvedAgentPermanentId = payload.isGlobal ? null : newAgentPermanentId || agents[0]?.permanentId || '';
            if (!payload.isGlobal && !resolvedAgentPermanentId) {
                throw new Error('Select an agent or enable global scope.');
            }

            setSaving(true);
            setError(null);
            try {
                await createWalletRecord({
                    ...payload,
                    agentPermanentId: resolvedAgentPermanentId || null,
                });
                setIsGithubConnectDialogOpen(false);
                await loadRecords();
                await loadGithubAppConnectionStatus();
            } finally {
                setSaving(false);
            }
        },
        [agents, createWalletRecord, loadGithubAppConnectionStatus, loadRecords, newAgentPermanentId],
    );

    /**
     * Applies SMTP defaults to simplify USE EMAIL setup.
     */
    const applyUseEmailSmtpTemplate = () => {
        setNewRecordType('ACCESS_TOKEN');
        setNewService(USE_EMAIL_SMTP_WALLET_SERVICE);
        setNewKey(USE_EMAIL_SMTP_WALLET_KEY);
        setNewJsonSchemaText(USE_EMAIL_SMTP_WALLET_SCHEMA_TEXT);
        if (!newSecret.trim()) {
            setNewSecret(USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE);
        }
    };

    /**
     * Starts editing one wallet row.
     */
    const startEditing = (record: UserWalletEntry) => {
        setEditingId(record.id);
        setEditingRecordType(record.recordType);
        setEditingService(record.service);
        setEditingKey(record.key);
        setEditingUsername(record.username || '');
        setEditingPassword(record.password || '');
        setEditingSecret(record.secret || '');
        setEditingCookies(record.cookies || '');
        setEditingJsonSchemaText(formatWalletJsonSchemaForTextarea(record.jsonSchema));
        setEditingIsGlobal(record.isGlobal);
        setEditingAgentPermanentId(record.agentPermanentId || agents[0]?.permanentId || '');
    };

    /**
     * Resets active wallet edit state.
     */
    const cancelEditing = () => {
        setEditingId(null);
        setEditingRecordType('ACCESS_TOKEN');
        setEditingService('');
        setEditingKey('');
        setEditingUsername('');
        setEditingPassword('');
        setEditingSecret('');
        setEditingCookies('');
        setEditingJsonSchemaText('');
        setEditingIsGlobal(false);
        setEditingAgentPermanentId('');
    };

    /**
     * Persists currently edited wallet record.
     */
    const updateRecord = async () => {
        if (!editingId) {
            return;
        }

        const validationError = validateRecordPayload({
            recordType: editingRecordType,
            service: editingService,
            username: editingUsername,
            password: editingPassword,
            secret: editingSecret,
            cookies: editingCookies,
            isGlobal: editingIsGlobal,
            agentPermanentId: editingAgentPermanentId,
            jsonSchemaText: editingJsonSchemaText,
        });
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const parsedJsonSchema = parseWalletJsonSchemaFromTextarea(editingJsonSchemaText);
            const response = await fetch(`/api/user-wallet/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordType: editingRecordType,
                    service: editingService,
                    key: editingKey || 'default',
                    jsonSchema: parsedJsonSchema,
                    username: editingRecordType === 'USERNAME_PASSWORD' ? editingUsername : undefined,
                    password: editingRecordType === 'USERNAME_PASSWORD' ? editingPassword : undefined,
                    secret: editingRecordType === 'ACCESS_TOKEN' ? editingSecret : undefined,
                    cookies: editingRecordType === 'SESSION_COOKIE' ? editingCookies : undefined,
                    isGlobal: editingIsGlobal,
                    agentPermanentId: editingIsGlobal ? null : editingAgentPermanentId,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to update wallet record.');
            }

            cancelEditing();
            await loadRecords();
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update wallet record.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Deletes one wallet record after user confirmation.
     */
    const deleteRecord = async (record: UserWalletEntry) => {
        const confirmed = await showConfirm({
            title: 'Delete wallet record',
            message: 'Do you want to delete this wallet record?',
            confirmLabel: 'Delete record',
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`/api/user-wallet/${record.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to delete wallet record.');
            }

            if (editingId === record.id) {
                cancelEditing();
            }

            await loadRecords();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete wallet record.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Returns human-readable scope label for one wallet record.
     */
    const getScopeLabel = (record: UserWalletEntry): string => {
        if (record.isGlobal) {
            return 'Global';
        }
        if (!record.agentPermanentId) {
            return 'Unknown agent';
        }
        return agentLabelByPermanentId.get(record.agentPermanentId) || record.agentPermanentId;
    };

    /**
     * Renders record-type-specific credential inputs.
     */
    const renderRecordTypeFields = (options: {
        recordType: WalletRecordType;
        username: string;
        password: string;
        secret: string;
        cookies: string;
        isSmtpRecord: boolean;
        setUsername: (value: string) => void;
        setPassword: (value: string) => void;
        setSecret: (value: string) => void;
        setCookies: (value: string) => void;
    }) => {
        if (options.recordType === 'USERNAME_PASSWORD') {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    <input
                        value={options.username}
                        onChange={(event) => options.setUsername(event.target.value)}
                        placeholder="Username"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <SecretInput
                        value={options.password}
                        onChange={(event) => options.setPassword(event.target.value)}
                        placeholder="Password"
                    />
                </div>
            );
        }

        if (options.recordType === 'SESSION_COOKIE') {
            return (
                <SecretTextarea
                    value={options.cookies}
                    onChange={(event) => options.setCookies(event.target.value)}
                    placeholder="session=abc123; path=/; secure"
                    textareaClassName="!min-h-[90px]"
                />
            );
        }

        return (
            <SecretTextarea
                value={options.secret}
                onChange={(event) => options.setSecret(event.target.value)}
                placeholder={options.isSmtpRecord ? USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE : 'Token / API key'}
                helperText={options.isSmtpRecord ? 'Multiline JSON is supported.' : undefined}
                textareaClassName="!min-h-[110px]"
            />
        );
    };

    /**
     * Renders one wallet record value with visibility toggle support.
     */
    const renderRecordData = (record: UserWalletEntry) => {
        if (record.recordType === 'USERNAME_PASSWORD') {
            return (
                <div className="space-y-2">
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                        {record.username || '-'}
                    </div>
                    <SecretInput value={record.password || ''} readOnly aria-label="Wallet password" inputClassName="h-9 text-xs" />
                </div>
            );
        }

        if (record.recordType === 'SESSION_COOKIE') {
            return (
                <SecretTextarea
                    value={record.cookies || ''}
                    readOnly
                    aria-label="Wallet cookies"
                    textareaClassName="!min-h-[72px] font-mono text-xs leading-5"
                />
            );
        }

        return (
            <SecretTextarea
                value={record.secret || ''}
                readOnly
                aria-label="Wallet secret"
                textareaClassName="!min-h-[72px] font-mono text-xs leading-5"
            />
        );
    };

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            <h1 className="text-3xl font-bold mb-8">User Wallet</h1>

            {error && <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">GitHub App</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {githubAppStatus?.isConfigured
                                ? githubAppStatus.isConnected
                                    ? 'Connected. USE PROJECT can obtain tokens automatically.'
                                    : 'Not connected yet. Connect once to enable automatic USE PROJECT tokens.'
                                : 'GitHub App is not configured on this server. You can still add tokens manually.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsGithubConnectDialogOpen(true)}
                        disabled={githubAppStatus?.isConfigured !== true}
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Connect with GitHub
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Create Wallet Record</h2>
                    <button
                        type="button"
                        onClick={applyUseEmailSmtpTemplate}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                        Use SMTP template
                    </button>
                </div>
                <form onSubmit={createRecord} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <select
                            value={newRecordType}
                            onChange={(event) => setNewRecordType(event.target.value as WalletRecordType)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ACCESS_TOKEN">Access Token / API Key</option>
                            <option value="USERNAME_PASSWORD">Username + Password</option>
                            <option value="SESSION_COOKIE">Session Cookie</option>
                        </select>
                        <input
                            value={newService}
                            onChange={(event) => setNewService(event.target.value)}
                            placeholder="Service (github, smtp...)"
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            value={newKey}
                            onChange={(event) => setNewKey(event.target.value)}
                            placeholder="Key (default)"
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {renderRecordTypeFields({
                        recordType: newRecordType,
                        username: newUsername,
                        password: newPassword,
                        secret: newSecret,
                        cookies: newCookies,
                        isSmtpRecord: isNewSmtpRecord,
                        setUsername: setNewUsername,
                        setPassword: setNewPassword,
                        setSecret: setNewSecret,
                        setCookies: setNewCookies,
                    })}

                    <label className="block text-sm text-gray-700">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            JSON schema (optional)
                        </span>
                        <textarea
                            value={newJsonSchemaText}
                            onChange={(event) => setNewJsonSchemaText(event.target.value)}
                            placeholder='{"type":"object","properties":{"token":{"type":"string"}}}'
                            className="w-full min-h-[120px] rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={newIsGlobal} onChange={(event) => setNewIsGlobal(event.target.checked)} />
                            Make this record global
                        </label>

                        <select
                            value={newAgentPermanentId}
                            onChange={(event) => setNewAgentPermanentId(event.target.value)}
                            disabled={newIsGlobal}
                            className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            {agents.map((agent) => (
                                <option key={agent.permanentId} value={agent.permanentId}>
                                    {agent.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Store Wallet Record'}
                    </button>
                </form>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scope filter</label>
                        <select
                            value={filterScope}
                            onChange={(event) => setFilterScope(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All records</option>
                            <option value="GLOBAL">Global records</option>
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
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search service, key, username..."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="button" onClick={() => void loadRecords()} className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300">
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scope</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Service / Key</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Loading wallet records...</td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No wallet records found.</td>
                            </tr>
                        ) : (
                            records.map((record) => {
                                const isEditing = editingId === record.id;
                                const schemaPreview = formatWalletJsonSchemaForTextarea(record.jsonSchema);
                                return (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3 text-sm text-gray-600">{getScopeLabel(record)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{record.recordType}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <div>{record.service} / {record.key}</div>
                                            {schemaPreview && (
                                                <details className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
                                                    <summary className="cursor-pointer text-xs font-medium text-gray-600">
                                                        JSON schema
                                                    </summary>
                                                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-gray-600">
                                                        {schemaPreview}
                                                    </pre>
                                                </details>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <div className="grid gap-2 sm:grid-cols-3">
                                                        <select
                                                            value={editingRecordType}
                                                            onChange={(event) => setEditingRecordType(event.target.value as WalletRecordType)}
                                                            className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="ACCESS_TOKEN">Access Token</option>
                                                            <option value="USERNAME_PASSWORD">Username + Password</option>
                                                            <option value="SESSION_COOKIE">Session Cookie</option>
                                                        </select>
                                                        <input
                                                            value={editingService}
                                                            onChange={(event) => setEditingService(event.target.value)}
                                                            className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <input
                                                            value={editingKey}
                                                            onChange={(event) => setEditingKey(event.target.value)}
                                                            className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>

                                                    {renderRecordTypeFields({
                                                        recordType: editingRecordType,
                                                        username: editingUsername,
                                                        password: editingPassword,
                                                        secret: editingSecret,
                                                        cookies: editingCookies,
                                                        isSmtpRecord: isEditingSmtpRecord,
                                                        setUsername: setEditingUsername,
                                                        setPassword: setEditingPassword,
                                                        setSecret: setEditingSecret,
                                                        setCookies: setEditingCookies,
                                                    })}

                                                    <textarea
                                                        value={editingJsonSchemaText}
                                                        onChange={(event) => setEditingJsonSchemaText(event.target.value)}
                                                        placeholder='{"type":"object"}'
                                                        className="w-full min-h-[100px] rounded-md border border-gray-300 px-2 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />

                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={editingIsGlobal}
                                                                onChange={(event) => setEditingIsGlobal(event.target.checked)}
                                                            />
                                                            Global
                                                        </label>
                                                        <select
                                                            value={editingAgentPermanentId}
                                                            onChange={(event) => setEditingAgentPermanentId(event.target.value)}
                                                            disabled={editingIsGlobal}
                                                            className="w-full sm:w-72 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                        >
                                                            {agents.map((agent) => (
                                                                <option key={agent.permanentId} value={agent.permanentId}>
                                                                    {agent.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                renderRecordData(record)
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(record.updatedAt).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => void updateRecord()} disabled={saving} className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50">
                                                        Save
                                                    </button>
                                                    <button onClick={cancelEditing} className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300">
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => startEditing(record)} className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => void deleteRecord(record)} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <WalletRecordDialog
                isOpen={isGithubConnectDialogOpen}
                request={githubConnectWalletRequest}
                onSubmit={handleGithubConnectDialogSubmit}
                onClose={() => setIsGithubConnectDialogOpen(false)}
                githubApp={{
                    isConfigured: githubAppStatus?.isConfigured === true,
                    agentPermanentId: newAgentPermanentId,
                    returnTo: '/system/user-wallet',
                }}
            />
        </div>
    );
}
