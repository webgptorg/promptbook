'use client';

import { buildCalendarOAuthConnectUrl } from '@/src/utils/calendarOAuthClient';
import { buildGithubAppConnectUrl } from '@/src/utils/githubAppClient';
import {
    USE_CALENDAR_GOOGLE_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from '@/src/utils/useCalendarGoogleWalletConstants';
import {
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from '@/src/utils/useProjectGithubWalletConstants';
import {
    USE_EMAIL_SMTP_WALLET_KEY,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from '@/src/utils/useEmailSmtpWalletConstants';
import { Calendar, Github, KeyRound, Lock, Save, UserRound, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Dialog } from '../Portal/Dialog';
import { SecretInput } from '../SecretInput/SecretInput';
import { SecretTextarea } from '../SecretTextarea/SecretTextarea';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';

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
    calendarOAuth?: {
        provider: 'google';
        calendarUrl: string;
        scopes: string[];
    };
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
 * Calendar OAuth connect settings passed into the shared wallet dialog.
 */
export type WalletRecordDialogCalendarOAuthOptions = {
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
    calendarOAuth?: WalletRecordDialogCalendarOAuthOptions;
};

/**
 * Dialog that captures one wallet credential record from user.
 */
export function WalletRecordDialog(props: WalletRecordDialogProps) {
    const { isOpen, request, onSubmit, onClose, githubApp, calendarOAuth } = props;
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
    const canUseCalendarOAuthConnect =
        calendarOAuth?.isConfigured === true && isUseCalendarWalletRequest(recordType, service, key);
    const isUseEmailSmtpWalletRequest = isUseEmailSmtpWalletRequestRecord(recordType, service, key);
    const manualFieldsVisible = (!canUseGithubAppConnect && !canUseCalendarOAuthConnect) || isManualTokenVisible;
    const requestedJsonSchema = request?.jsonSchema;
    const requestedJsonSchemaText = useMemo(
        () => formatWalletJsonSchemaForDisplay(requestedJsonSchema),
        [requestedJsonSchema],
    );
    const hasUnsavedChanges = useMemo(() => {
        if (!isOpen || !request) {
            return false;
        }

        if (recordType !== request.recordType) {
            return true;
        }

        if (service !== request.service || key !== request.key) {
            return true;
        }

        if (isUserScoped !== request.isUserScoped || isGlobal !== request.isGlobal) {
            return true;
        }

        return username !== '' || password !== '' || secret !== '' || cookies !== '';
    }, [
        cookies,
        isGlobal,
        isOpen,
        isUserScoped,
        key,
        password,
        recordType,
        request,
        secret,
        service,
        username,
    ]);
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges,
        isCloseBlocked: isSubmitting,
        onClose,
    });
    const { t } = useServerLanguage();

    const validationError = useMemo(() => {
        if (!manualFieldsVisible) {
            return null;
        }

        if (!service.trim()) {
            return t('walletDialog.validationServiceRequired');
        }
        if (recordType === 'USERNAME_PASSWORD' && (!username.trim() || !password.trim())) {
            return t('walletDialog.validationUsernamePasswordRequired');
        }
        if (recordType === 'SESSION_COOKIE' && !cookies.trim()) {
            return t('walletDialog.validationCookiesRequired');
        }
        if (recordType === 'ACCESS_TOKEN' && !secret.trim()) {
            return t('walletDialog.validationSecretRequired');
        }
        return null;
    }, [cookies, manualFieldsVisible, password, recordType, secret, service, t, username]);

    if (!isOpen || !request) {
        return null;
    }

    return (
        <Dialog onClose={requestClose} className="w-full max-w-xl p-0 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <KeyRound className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{t('walletDialog.title')}</p>
                            <p className="text-xs text-gray-500">{t('walletDialog.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t('walletDialog.closeAriaLabel')}
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
                                : t('walletDialog.errorFailed'),
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
                            {t('walletDialog.requestedJsonSchemaLabel')}
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
                            {t('walletDialog.connectGithubAction')}
                        </button>
                        {!isManualTokenVisible && (
                            <button
                                type="button"
                                onClick={() => setIsManualTokenVisible(true)}
                                disabled={isSubmitting}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <KeyRound className="h-4 w-4" />
                                {t('walletDialog.addTokenManuallyAction')}
                            </button>
                        )}
                    </div>
                )}

                {canUseCalendarOAuthConnect && (
                    <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
                        <div className="space-y-1 text-xs text-blue-900">
                            <p className="font-semibold uppercase tracking-wide">{t('walletDialog.calendarAccessTitle')}</p>
                            <p>
                                {t('walletDialog.calendarUrlLabel')}{' '}
                                <span className="font-mono break-all">
                                    {request.calendarOAuth?.calendarUrl || 'https://calendar.google.com/calendar/u/0/r'}
                                </span>
                            </p>
                            <p className="font-semibold uppercase tracking-wide pt-1">{t('walletDialog.calendarScopesLabel')}</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                {(request.calendarOAuth?.scopes && request.calendarOAuth.scopes.length > 0
                                    ? request.calendarOAuth.scopes
                                    : ['https://www.googleapis.com/auth/calendar']
                                ).map((scope) => (
                                    <li key={scope} className="font-mono break-all">
                                        {scope}
                                    </li>
                                ))}
                            </ul>
                            <p className="font-semibold uppercase tracking-wide pt-1">{t('walletDialog.calendarExamplesLabel')}</p>
                            <p>{t('walletDialog.calendarExamplesDescription')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                redirectToCalendarOAuthConnect({
                                    isUserScoped,
                                    isGlobal,
                                    calendarOAuth,
                                    calendarUrl:
                                        request.calendarOAuth?.calendarUrl ||
                                        'https://calendar.google.com/calendar/u/0/r',
                                    scopes:
                                        request.calendarOAuth?.scopes && request.calendarOAuth.scopes.length > 0
                                            ? request.calendarOAuth.scopes
                                            : ['https://www.googleapis.com/auth/calendar'],
                                })
                            }
                            disabled={isSubmitting}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Calendar className="h-4 w-4" />
                            {t('walletDialog.connectCalendarAction')}
                        </button>
                        {!isManualTokenVisible && (
                            <button
                                type="button"
                                onClick={() => setIsManualTokenVisible(true)}
                                disabled={isSubmitting}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <KeyRound className="h-4 w-4" />
                                {t('walletDialog.addTokenManuallyAction')}
                            </button>
                        )}
                    </div>
                )}

                {manualFieldsVisible && (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('walletDialog.typeLabel')}</label>
                                <select
                                    value={recordType}
                                    onChange={(event) => setRecordType(event.target.value as WalletRecordType)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                    <option value="ACCESS_TOKEN">{t('walletDialog.accessTokenOption')}</option>
                                    <option value="USERNAME_PASSWORD">{t('walletDialog.usernamePasswordOption')}</option>
                                    <option value="SESSION_COOKIE">{t('walletDialog.sessionCookieOption')}</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor={serviceInputId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    {t('walletDialog.serviceLabel')}
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
                                    {t('walletDialog.keyLabel')}
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
                                        {t('walletDialog.usernameLabel')}
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
                                        {t('walletDialog.passwordLabel')}
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
                                    label={t('walletDialog.secretLabel')}
                                    value={secret}
                                    onChange={(event) => setSecret(event.target.value)}
                                    placeholder={isUseEmailSmtpWalletRequest ? USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE : t('walletDialog.secretPlaceholder')}
                                    helperText={isUseEmailSmtpWalletRequest ? t('walletDialog.secretHelperText') : undefined}
                                    containerClassName="text-sm text-gray-700"
                                />
                            </div>
                        )}

                        {recordType === 'SESSION_COOKIE' && (
                            <label className="text-sm text-gray-700">
                                <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <Lock className="h-3 w-3" />
                                    {t('walletDialog.cookiesLabel')}
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
                                {t('walletDialog.scopeToUserLabel')}
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={!isGlobal}
                                    onChange={(event) => setIsGlobal(!event.target.checked)}
                                />
                                {t('walletDialog.scopeToAgentLabel')}
                            </label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={requestClose}
                                disabled={isSubmitting}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {t('walletDialog.cancelLabel')}
                            </button>
                            <button
                                type="submit"
                                disabled={Boolean(validationError) || isSubmitting}
                                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {t('walletDialog.saveAction')}
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
 * Returns true when dialog currently targets USE CALENDAR Google access token.
 */
function isUseCalendarWalletRequest(recordType: WalletRecordType, service: string, key: string): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_CALENDAR_GOOGLE_WALLET_SERVICE &&
        key.trim() === USE_CALENDAR_GOOGLE_WALLET_KEY
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

/**
 * Redirects browser to Google Calendar OAuth connect endpoint.
 */
function redirectToCalendarOAuthConnect(options: {
    isUserScoped: boolean;
    isGlobal: boolean;
    calendarOAuth?: WalletRecordDialogCalendarOAuthOptions;
    calendarUrl: string;
    scopes: string[];
}): void {
    const effectiveIsGlobal = options.isGlobal || !options.calendarOAuth?.agentPermanentId;
    const returnTo =
        options.calendarOAuth?.returnTo ||
        (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/system/user-wallet');
    const connectUrl = buildCalendarOAuthConnectUrl({
        returnTo,
        isGlobal: effectiveIsGlobal,
        isUserScoped: options.isUserScoped,
        agentPermanentId: options.calendarOAuth?.agentPermanentId || null,
        calendarUrl: options.calendarUrl,
        scopes: options.scopes,
    });

    if (typeof window !== 'undefined') {
        window.location.assign(connectUrl);
    }
}
