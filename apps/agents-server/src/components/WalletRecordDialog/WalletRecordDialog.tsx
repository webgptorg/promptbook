'use client';

import { buildGithubAppConnectUrl } from '@/src/utils/githubAppClient';
import {
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from '@/src/utils/useProjectGithubWalletConstants';
import {
    USE_EMAIL_SMTP_WALLET_KEY,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from '@/src/utils/useEmailSmtpWalletConstants';
import { Github, KeyRound, Lock, Save, UserRound, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Dialog } from '../Portal/Dialog';
import { SecretInput } from '../SecretInput/SecretInput';
import { SecretTextarea } from '../SecretTextarea/SecretTextarea';

/**
 * Wallet record type supported by the dialog.
 */
export type WalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Pending wallet request shown in the dialog.
 */
export type PendingWalletRecordRequest = {
    marker: string;
    sourceToolName: string;
    recordType: WalletRecordType;
    service: string;
    key: string;
    jsonSchema?: unknown;
    message?: string;
    isUserScoped: boolean;
    isGlobal: boolean;
};

/**
 * Wallet payload submitted from the dialog.
 */
export type WalletRecordDialogSubmitPayload = {
    recordType: WalletRecordType;
    service: string;
    key: string;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
    jsonSchema?: unknown;
    isUserScoped: boolean;
    isGlobal: boolean;
};

/**
 * GitHub App connect settings passed into the shared wallet dialog.
 */
export type WalletRecordDialogGithubAppOptions = {
    isConfigured: boolean;
    returnTo?: string;
    agentPermanentId?: string | null;
};

/**
 * Props for wallet record dialog.
 */
export type WalletRecordDialogProps = {
    isOpen: boolean;
    request: PendingWalletRecordRequest | null;
    onSubmit: (payload: WalletRecordDialogSubmitPayload) => Promise<void> | void;
    onClose: () => void;
    githubApp?: WalletRecordDialogGithubAppOptions;
};

/**
 * Dialog that captures one wallet credential record from user.
 */
export function WalletRecordDialog(props: WalletRecordDialogProps) {
    const { isOpen, request, onSubmit, onClose, githubApp } = props;
    const serviceInputId = useId();
    const keyInputId = useId();

    const [recordType, setRecordType] = useState<WalletRecordType>('ACCESS_TOKEN');
    const [service, setService] = useState('');
    const [key, setKey] = useState('default');
    const [isUserScoped, setIsUserScoped] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [secret, setSecret] = useState('');
    const [cookies, setCookies] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isManualTokenVisible, setIsManualTokenVisible] = useState(false);

    useEffect(() => {
        if (!isOpen || !request) {
            setError(null);
            setIsSubmitting(false);
            setIsManualTokenVisible(false);
            return;
        }

        setRecordType(request.recordType);
        setService(request.service);
        setKey(request.key);
        setIsUserScoped(request.isUserScoped);
        setIsGlobal(request.isGlobal);
        setUsername('');
        setPassword('');
        setSecret('');
        setCookies('');
        setError(null);
        setIsManualTokenVisible(false);
    }, [isOpen, request]);

    const canUseGithubAppConnect =
        githubApp?.isConfigured === true && isUseProjectGithubWalletRequest(recordType, service, key);
    const isUseEmailSmtpWalletRequest = isUseEmailSmtpWalletRequestRecord(recordType, service, key);
    const manualFieldsVisible = !canUseGithubAppConnect || isManualTokenVisible;
    const requestedJsonSchema = request?.jsonSchema;
    const requestedJsonSchemaText = useMemo(
        () => formatWalletJsonSchemaForDisplay(requestedJsonSchema),
        [requestedJsonSchema],
    );

    const validationError = useMemo(() => {
        if (!manualFieldsVisible) {
            return null;
        }

        if (!service.trim()) {
            return 'Service is required.';
        }
        if (recordType === 'USERNAME_PASSWORD' && (!username.trim() || !password.trim())) {
            return 'Username and password are required.';
        }
        if (recordType === 'SESSION_COOKIE' && !cookies.trim()) {
            return 'Cookies are required.';
        }
        if (recordType === 'ACCESS_TOKEN' && !secret.trim()) {
            return 'Secret is required.';
        }
        return null;
    }, [cookies, manualFieldsVisible, password, recordType, secret, service, username]);

    if (!isOpen || !request) {
        return null;
    }

    return (
        <Dialog onClose={isSubmitting ? () => undefined : onClose} className="w-full max-w-xl p-0 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <KeyRound className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Wallet credential requested</p>
                            <p className="text-xs text-gray-500">Provide private data for tool access</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <form
                className="space-y-4 px-5 py-5"
                onSubmit={async (event) => {
                    event.preventDefault();
                    setError(null);

                    if (validationError) {
                        setError(validationError);
                        return;
                    }

                    setIsSubmitting(true);
                    try {
                        await onSubmit({
                            recordType,
                            service,
                            key,
                            username: recordType === 'USERNAME_PASSWORD' ? username : undefined,
                            password: recordType === 'USERNAME_PASSWORD' ? password : undefined,
                            secret: recordType === 'ACCESS_TOKEN' ? secret : undefined,
                            cookies: recordType === 'SESSION_COOKIE' ? cookies : undefined,
                            jsonSchema: requestedJsonSchema,
                            isUserScoped,
                            isGlobal,
                        });
                    } catch (submitError) {
                        setError(
                            submitError instanceof Error
                                ? submitError.message
                                : 'Failed to store wallet credential.',
                        );
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            >
                {request.message && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {request.message}
                    </div>
                )}

                {requestedJsonSchemaText && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Requested JSON schema
                        </p>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 font-mono text-xs text-gray-700">
                            {requestedJsonSchemaText}
                        </pre>
                    </div>
                )}

                {error && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                )}

                {canUseGithubAppConnect && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => redirectToGithubAppConnect({ isUserScoped, isGlobal, githubApp })}
                            disabled={isSubmitting}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Github className="h-4 w-4" />
                            Connect with GitHub App
                        </button>
                        {!isManualTokenVisible && (
                            <button
                                type="button"
                                onClick={() => setIsManualTokenVisible(true)}
                                disabled={isSubmitting}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <KeyRound className="h-4 w-4" />
                                Add token manually
                            </button>
                        )}
                    </div>
                )}

                {manualFieldsVisible && (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Type</label>
                                <select
                                    value={recordType}
                                    onChange={(event) => setRecordType(event.target.value as WalletRecordType)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                    <option value="ACCESS_TOKEN">Access Token</option>
                                    <option value="USERNAME_PASSWORD">Username + Password</option>
                                    <option value="SESSION_COOKIE">Session Cookie</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor={serviceInputId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Service
                                </label>
                                <input
                                    id={serviceInputId}
                                    value={service}
                                    onChange={(event) => setService(event.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div>
                                <label htmlFor={keyInputId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Key
                                </label>
                                <input
                                    id={keyInputId}
                                    value={key}
                                    onChange={(event) => setKey(event.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                        </div>

                        {recordType === 'USERNAME_PASSWORD' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-sm text-gray-700">
                                    <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <UserRound className="h-3 w-3" />
                                        Username
                                    </span>
                                    <input
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    />
                                </label>
                                <label className="text-sm text-gray-700">
                                    <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <Lock className="h-3 w-3" />
                                        Password
                                    </span>
                                    <SecretInput
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    />
                                </label>
                            </div>
                        )}

                        {recordType === 'ACCESS_TOKEN' && (
                            <div className="space-y-3">
                                <SecretTextarea
                                    label="Secret"
                                    value={secret}
                                    onChange={(event) => setSecret(event.target.value)}
                                    placeholder={isUseEmailSmtpWalletRequest ? USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE : 'Token / API key'}
                                    helperText={isUseEmailSmtpWalletRequest ? 'Multiline JSON is supported.' : undefined}
                                    containerClassName="text-sm text-gray-700"
                                />
                            </div>
                        )}

                        {recordType === 'SESSION_COOKIE' && (
                            <label className="text-sm text-gray-700">
                                <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <Lock className="h-3 w-3" />
                                    Cookies
                                </span>
                                <textarea
                                    value={cookies}
                                    onChange={(event) => setCookies(event.target.value)}
                                    className="min-h-[90px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </label>
                        )}

                        <div className="space-y-2">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={isUserScoped}
                                    onChange={(event) => setIsUserScoped(event.target.checked)}
                                />
                                Scope to current user
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={!isGlobal}
                                    onChange={(event) => setIsGlobal(!event.target.checked)}
                                />
                                Scope to current agent
                            </label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={Boolean(validationError) || isSubmitting}
                                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                Save to wallet
                            </button>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}

/**
 * Returns true when dialog currently targets USE PROJECT GitHub access token.
 */
function isUseProjectGithubWalletRequest(recordType: WalletRecordType, service: string, key: string): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_PROJECT_GITHUB_WALLET_SERVICE &&
        key.trim() === USE_PROJECT_GITHUB_WALLET_KEY
    );
}

/**
 * Returns true when dialog currently targets USE EMAIL SMTP access token.
 */
function isUseEmailSmtpWalletRequestRecord(recordType: WalletRecordType, service: string, key: string): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_EMAIL_SMTP_WALLET_SERVICE &&
        key.trim() === USE_EMAIL_SMTP_WALLET_KEY
    );
}

/**
 * Converts requested JSON schema payload into pretty-printed text for UI display.
 */
function formatWalletJsonSchemaForDisplay(value: unknown): string | null {
    if (!value) {
        return null;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return null;
    }
}

/**
 * Redirects browser to GitHub App connect endpoint.
 */
function redirectToGithubAppConnect(options: {
    isUserScoped: boolean;
    isGlobal: boolean;
    githubApp?: WalletRecordDialogGithubAppOptions;
}): void {
    const effectiveIsGlobal = options.isGlobal || !options.githubApp?.agentPermanentId;
    const returnTo =
        options.githubApp?.returnTo ||
        (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/system/user-wallet');
    const connectUrl = buildGithubAppConnectUrl({
        returnTo,
        isGlobal: effectiveIsGlobal,
        isUserScoped: options.isUserScoped,
        agentPermanentId: options.githubApp?.agentPermanentId || null,
    });

    if (typeof window !== 'undefined') {
        window.location.assign(connectUrl);
    }
}
