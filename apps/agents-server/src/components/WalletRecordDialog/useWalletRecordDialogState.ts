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
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from '@/src/utils/useEmailSmtpWalletConstants';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';
import type {
    PendingWalletRecordRequest,
    WalletRecordDialogCalendarOAuthOptions,
    WalletRecordDialogGithubAppOptions,
    WalletRecordDialogProps,
    WalletRecordDialogSubmitPayload,
    WalletRecordType,
} from './WalletRecordDialog';

/**
 * Default Google Calendar URL shown when the request omits one.
 *
 * @private function of WalletRecordDialog
 */
const DEFAULT_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r';

/**
 * Default Google Calendar scope list shown when the request omits one.
 *
 * @private function of WalletRecordDialog
 */
const DEFAULT_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

/**
 * Editable draft tracked while the wallet dialog is open.
 *
 * @private function of WalletRecordDialog
 */
type WalletRecordDialogFormState = {
    recordType: WalletRecordType;
    service: string;
    key: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    username: string;
    password: string;
    secret: string;
    cookies: string;
};

/**
 * Callback that updates one wallet-dialog draft field.
 *
 * @private function of WalletRecordDialog
 */
type UpdateWalletRecordDialogFormState = <Field extends keyof WalletRecordDialogFormState>(
    field: Field,
    value: WalletRecordDialogFormState[Field],
) => void;

/**
 * Normalized calendar OAuth details shown in the connect panel.
 *
 * @private function of WalletRecordDialog
 */
type WalletRecordDialogCalendarConnectDetails = {
    calendarUrl: string;
    scopes: string[];
};

/**
 * State and handlers returned for rendering the wallet dialog.
 *
 * @private function of WalletRecordDialog
 */
type UseWalletRecordDialogStateResult = {
    calendarConnectDetails: WalletRecordDialogCalendarConnectDetails;
    canUseCalendarOAuthConnect: boolean;
    canUseGithubAppConnect: boolean;
    error: string | null;
    formState: WalletRecordDialogFormState;
    handleCalendarOAuthConnect: () => void;
    handleGithubAppConnect: () => void;
    handleOpenManualFields: () => void;
    handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    isManualFieldsVisible: boolean;
    isManualTokenVisible: boolean;
    isSubmitting: boolean;
    isUseEmailSmtpWalletRequest: boolean;
    isUseProjectGithubManualInstructionsVisible: boolean;
    requestedJsonSchemaText: string | null;
    requestClose: () => void;
    t: ReturnType<typeof useServerLanguage>['t'];
    updateFormState: UpdateWalletRecordDialogFormState;
    validationError: string | null;
};

/**
 * Creates the initial editable draft for the current request.
 *
 * @private function of WalletRecordDialog
 */
function createInitialWalletRecordDialogFormState(
    request: PendingWalletRecordRequest | null,
): WalletRecordDialogFormState {
    return {
        recordType: request?.recordType || 'ACCESS_TOKEN',
        service: request?.service || '',
        key: request?.key || 'default',
        isUserScoped: request?.isUserScoped || false,
        isGlobal: request?.isGlobal || false,
        username: '',
        password: '',
        secret: '',
        cookies: '',
    };
}

/**
 * Updates one field inside the current editable draft.
 *
 * @private function of WalletRecordDialog
 */
function createUpdatedWalletRecordDialogFormState<
    Field extends keyof WalletRecordDialogFormState,
>(
    formState: WalletRecordDialogFormState,
    field: Field,
    value: WalletRecordDialogFormState[Field],
): WalletRecordDialogFormState {
    return {
        ...formState,
        [field]: value,
    };
}

/**
 * Returns true when dialog currently targets USE PROJECT GitHub access token.
 *
 * @private function of WalletRecordDialog
 */
function isUseProjectGithubWalletRequest(
    recordType: WalletRecordType,
    service: string,
    key: string,
): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_PROJECT_GITHUB_WALLET_SERVICE &&
        key.trim() === USE_PROJECT_GITHUB_WALLET_KEY
    );
}

/**
 * Returns true when dialog currently targets USE CALENDAR Google access token.
 *
 * @private function of WalletRecordDialog
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
 *
 * @private function of WalletRecordDialog
 */
function isUseEmailSmtpWalletRequestRecord(
    recordType: WalletRecordType,
    service: string,
    key: string,
): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_EMAIL_SMTP_WALLET_SERVICE &&
        key.trim() === USE_EMAIL_SMTP_WALLET_KEY
    );
}

/**
 * Converts requested JSON schema payload into pretty-printed text for UI display.
 *
 * @private function of WalletRecordDialog
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
 * Resolves the calendar details displayed in the connect panel.
 *
 * @private function of WalletRecordDialog
 */
function resolveWalletRecordDialogCalendarConnectDetails(
    request: PendingWalletRecordRequest | null,
): WalletRecordDialogCalendarConnectDetails {
    return {
        calendarUrl: request?.calendarOAuth?.calendarUrl || DEFAULT_CALENDAR_URL,
        scopes:
            request?.calendarOAuth?.scopes && request.calendarOAuth.scopes.length > 0
                ? request.calendarOAuth.scopes
                : DEFAULT_CALENDAR_SCOPES,
    };
}

/**
 * Determines whether the user has edited any values that differ from the original request.
 *
 * @private function of WalletRecordDialog
 */
function hasWalletRecordDialogUnsavedChanges(
    isOpen: boolean,
    request: PendingWalletRecordRequest | null,
    formState: WalletRecordDialogFormState,
): boolean {
    if (!isOpen || !request) {
        return false;
    }

    if (formState.recordType !== request.recordType) {
        return true;
    }

    if (formState.service !== request.service || formState.key !== request.key) {
        return true;
    }

    if (formState.isUserScoped !== request.isUserScoped || formState.isGlobal !== request.isGlobal) {
        return true;
    }

    return (
        formState.username !== '' ||
        formState.password !== '' ||
        formState.secret !== '' ||
        formState.cookies !== ''
    );
}

/**
 * Validates the currently visible manual wallet fields.
 *
 * @private function of WalletRecordDialog
 */
function createWalletRecordDialogValidationError(
    formState: WalletRecordDialogFormState,
    isManualFieldsVisible: boolean,
    t: ReturnType<typeof useServerLanguage>['t'],
): string | null {
    if (!isManualFieldsVisible) {
        return null;
    }

    if (!formState.service.trim()) {
        return t('walletDialog.validationServiceRequired');
    }

    if (
        formState.recordType === 'USERNAME_PASSWORD' &&
        (!formState.username.trim() || !formState.password.trim())
    ) {
        return t('walletDialog.validationUsernamePasswordRequired');
    }

    if (formState.recordType === 'SESSION_COOKIE' && !formState.cookies.trim()) {
        return t('walletDialog.validationCookiesRequired');
    }

    if (formState.recordType === 'ACCESS_TOKEN' && !formState.secret.trim()) {
        return t('walletDialog.validationSecretRequired');
    }

    return null;
}

/**
 * Builds the submitted wallet payload from the current draft.
 *
 * @private function of WalletRecordDialog
 */
function createWalletRecordDialogSubmitPayload(
    formState: WalletRecordDialogFormState,
    jsonSchema: unknown,
): WalletRecordDialogSubmitPayload {
    return {
        recordType: formState.recordType,
        service: formState.service,
        key: formState.key,
        username: formState.recordType === 'USERNAME_PASSWORD' ? formState.username : undefined,
        password: formState.recordType === 'USERNAME_PASSWORD' ? formState.password : undefined,
        secret: formState.recordType === 'ACCESS_TOKEN' ? formState.secret : undefined,
        cookies: formState.recordType === 'SESSION_COOKIE' ? formState.cookies : undefined,
        jsonSchema,
        isUserScoped: formState.isUserScoped,
        isGlobal: formState.isGlobal,
    };
}

/**
 * Resolves the return URL used by wallet connect flows.
 *
 * @private function of WalletRecordDialog
 */
function resolveWalletRecordDialogReturnTo(returnTo?: string): string {
    if (returnTo) {
        return returnTo;
    }

    if (typeof window !== 'undefined') {
        return `${window.location.pathname}${window.location.search}`;
    }

    return '/system/user-wallet';
}

/**
 * Builds the GitHub App connect URL for the current draft.
 *
 * @private function of WalletRecordDialog
 */
function createWalletRecordDialogGithubAppConnectUrl(options: {
    formState: WalletRecordDialogFormState;
    githubApp?: WalletRecordDialogGithubAppOptions;
}): string {
    const effectiveIsGlobal = options.formState.isGlobal || !options.githubApp?.agentPermanentId;

    return buildGithubAppConnectUrl({
        returnTo: resolveWalletRecordDialogReturnTo(options.githubApp?.returnTo),
        isGlobal: effectiveIsGlobal,
        isUserScoped: options.formState.isUserScoped,
        agentPermanentId: options.githubApp?.agentPermanentId || null,
    });
}

/**
 * Builds the Calendar OAuth connect URL for the current draft.
 *
 * @private function of WalletRecordDialog
 */
function createWalletRecordDialogCalendarOAuthConnectUrl(options: {
    calendarConnectDetails: WalletRecordDialogCalendarConnectDetails;
    calendarOAuth?: WalletRecordDialogCalendarOAuthOptions;
    formState: WalletRecordDialogFormState;
}): string {
    const effectiveIsGlobal = options.formState.isGlobal || !options.calendarOAuth?.agentPermanentId;

    return buildCalendarOAuthConnectUrl({
        returnTo: resolveWalletRecordDialogReturnTo(options.calendarOAuth?.returnTo),
        isGlobal: effectiveIsGlobal,
        isUserScoped: options.formState.isUserScoped,
        agentPermanentId: options.calendarOAuth?.agentPermanentId || null,
        calendarUrl: options.calendarConnectDetails.calendarUrl,
        scopes: options.calendarConnectDetails.scopes,
    });
}

/**
 * Redirects the browser to an external wallet connect flow.
 *
 * @private function of WalletRecordDialog
 */
function redirectToWalletRecordDialogConnectUrl(connectUrl: string): void {
    if (typeof window !== 'undefined') {
        window.location.assign(connectUrl);
    }
}

/**
 * Manages wallet dialog draft state, validation, and connect-flow decisions.
 *
 * @private function of WalletRecordDialog
 */
export function useWalletRecordDialogState(
    props: WalletRecordDialogProps,
): UseWalletRecordDialogStateResult {
    const { isOpen, request, onSubmit, onClose, githubApp, calendarOAuth } = props;

    const [formState, setFormState] = useState<WalletRecordDialogFormState>(() =>
        createInitialWalletRecordDialogFormState(request),
    );
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

        setFormState(createInitialWalletRecordDialogFormState(request));
        setError(null);
        setIsManualTokenVisible(false);
    }, [isOpen, request]);

    const updateFormState = useCallback<UpdateWalletRecordDialogFormState>((field, value) => {
        setFormState((currentFormState) =>
            createUpdatedWalletRecordDialogFormState(currentFormState, field, value),
        );
    }, []);

    const canUseGithubAppConnect =
        githubApp?.isConfigured === true &&
        isUseProjectGithubWalletRequest(formState.recordType, formState.service, formState.key);
    const canUseCalendarOAuthConnect =
        calendarOAuth?.isConfigured === true &&
        isUseCalendarWalletRequest(formState.recordType, formState.service, formState.key);
    const isUseEmailSmtpWalletRequest = isUseEmailSmtpWalletRequestRecord(
        formState.recordType,
        formState.service,
        formState.key,
    );
    const isManualFieldsVisible =
        (!canUseGithubAppConnect && !canUseCalendarOAuthConnect) || isManualTokenVisible;
    const isUseProjectGithubManualInstructionsVisible =
        isManualFieldsVisible &&
        isUseProjectGithubWalletRequest(formState.recordType, formState.service, formState.key);

    const requestedJsonSchema = request?.jsonSchema;
    const requestedJsonSchemaText = useMemo(
        () => formatWalletJsonSchemaForDisplay(requestedJsonSchema),
        [requestedJsonSchema],
    );
    const calendarConnectDetails = useMemo(
        () => resolveWalletRecordDialogCalendarConnectDetails(request),
        [request],
    );
    const hasUnsavedChanges = useMemo(
        () => hasWalletRecordDialogUnsavedChanges(isOpen, request, formState),
        [formState, isOpen, request],
    );

    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges,
        isCloseBlocked: isSubmitting,
        onClose,
    });
    const { t } = useServerLanguage();

    const validationError = useMemo(
        () => createWalletRecordDialogValidationError(formState, isManualFieldsVisible, t),
        [formState, isManualFieldsVisible, t],
    );

    const handleOpenManualFields = useCallback(() => {
        setIsManualTokenVisible(true);
    }, []);

    const handleGithubAppConnect = useCallback(() => {
        redirectToWalletRecordDialogConnectUrl(
            createWalletRecordDialogGithubAppConnectUrl({
                formState,
                githubApp,
            }),
        );
    }, [formState, githubApp]);

    const handleCalendarOAuthConnect = useCallback(() => {
        redirectToWalletRecordDialogConnectUrl(
            createWalletRecordDialogCalendarOAuthConnectUrl({
                calendarConnectDetails,
                calendarOAuth,
                formState,
            }),
        );
    }, [calendarConnectDetails, calendarOAuth, formState]);

    const handleSubmit = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);

            if (validationError) {
                setError(validationError);
                return;
            }

            setIsSubmitting(true);

            try {
                await onSubmit(createWalletRecordDialogSubmitPayload(formState, requestedJsonSchema));
            } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : t('walletDialog.errorFailed'));
            } finally {
                setIsSubmitting(false);
            }
        },
        [formState, onSubmit, requestedJsonSchema, t, validationError],
    );

    return {
        calendarConnectDetails,
        canUseCalendarOAuthConnect,
        canUseGithubAppConnect,
        error,
        formState,
        handleCalendarOAuthConnect,
        handleGithubAppConnect,
        handleOpenManualFields,
        handleSubmit,
        isManualFieldsVisible,
        isManualTokenVisible,
        isSubmitting,
        isUseEmailSmtpWalletRequest,
        isUseProjectGithubManualInstructionsVisible,
        requestedJsonSchemaText,
        requestClose,
        t,
        updateFormState,
        validationError,
    };
}
