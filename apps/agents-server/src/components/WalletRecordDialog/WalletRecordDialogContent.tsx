'use client';

import { USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE } from '@/src/utils/useEmailSmtpWalletConstants';
import { Calendar, Github, KeyRound, Lock, Save, UserRound } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { SecretInput } from '../SecretInput/SecretInput';
import { SecretTextarea } from '../SecretTextarea/SecretTextarea';
import type { PendingWalletRecordRequest, WalletRecordType } from './WalletRecordDialog';
import { useWalletRecordDialogState } from './useWalletRecordDialogState';

/**
 * GitHub settings page used to create a fine-grained personal access token manually.
 *
 * @private function of WalletRecordDialog
 */
const GITHUB_FINE_GRAINED_TOKEN_SETTINGS_URL = 'https://github.com/settings/personal-access-tokens/new';

/**
 * GitHub documentation page that explains personal access token setup.
 *
 * @private function of WalletRecordDialog
 */
const GITHUB_PERSONAL_ACCESS_TOKEN_DOCS_URL =
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens';

/**
 * State returned from `useWalletRecordDialogState`.
 *
 * @private function of WalletRecordDialog
 */
type WalletRecordDialogState = ReturnType<typeof useWalletRecordDialogState>;

/**
 * Shared props used by wallet dialog sections.
 *
 * @private function of WalletRecordDialog
 */
type WalletRecordDialogSectionProps = {
    /**
     * Pending wallet request being rendered.
     */
    readonly request: PendingWalletRecordRequest;
    /**
     * Derived dialog state and handlers.
     */
    readonly state: WalletRecordDialogState;
};

/**
 * Props for the manual form section.
 *
 * @private function of WalletRecordDialog
 */
type WalletRecordDialogManualSectionProps = {
    /**
     * Derived dialog state and handlers.
     */
    readonly state: WalletRecordDialogState;
    /**
     * Input id for the service field.
     */
    readonly serviceInputId: string;
    /**
     * Input id for the key field.
     */
    readonly keyInputId: string;
};

/**
 * Props for the repeated "Add token manually" button.
 *
 * @private function of WalletRecordDialog
 */
type WalletManualTokenButtonProps = {
    /**
     * Whether the button is disabled.
     */
    readonly isDisabled: boolean;
    /**
     * Opens the manual token form.
     */
    readonly onClick: () => void;
    /**
     * Localized button label.
     */
    readonly label: string;
};

/**
 * Props for the manual GitHub token instruction panel.
 *
 * @private function of WalletRecordDialog
 */
type GithubManualTokenInstructionsProps = {
    /**
     * Panel heading shown above the ordered steps.
     */
    readonly title: string;
    /**
     * First setup step shown with the GitHub settings link.
     */
    readonly stepOne: string;
    /**
     * Link label that opens GitHub token settings in a new tab.
     */
    readonly openSettingsLabel: string;
    /**
     * Second setup step shown with the GitHub docs link.
     */
    readonly stepTwo: string;
    /**
     * Link label that opens GitHub documentation in a new tab.
     */
    readonly openDocsLabel: string;
    /**
     * Third setup step describing required repository permissions.
     */
    readonly stepThree: string;
    /**
     * Final step describing how to paste and save the generated token.
     */
    readonly stepFour: string;
};

/**
 * Props accepted by the shared external instruction link.
 *
 * @private function of WalletRecordDialog
 */
type WalletExternalInstructionLinkProps = {
    /**
     * Target URL opened by the link.
     */
    readonly href: string;
    /**
     * Human-readable link label.
     */
    readonly children: ReactNode;
};

/**
 * Renders the wallet dialog form body with focused sections per branch.
 *
 * @private function of WalletRecordDialog
 */
export function WalletRecordDialogContent({ request, state }: WalletRecordDialogSectionProps) {
    const serviceInputId = useId();
    const keyInputId = useId();

    return (
        <form className="space-y-4 px-5 py-5" onSubmit={state.handleSubmit}>
            <WalletRecordDialogNotices request={request} state={state} />
            <WalletRecordDialogConnectPanels request={request} state={state} />
            {state.isManualFieldsVisible && (
                <WalletRecordDialogManualSection
                    state={state}
                    serviceInputId={serviceInputId}
                    keyInputId={keyInputId}
                />
            )}
        </form>
    );
}

/**
 * Renders request notices, schema previews, and validation errors.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogNotices({ request, state }: WalletRecordDialogSectionProps) {
    return (
        <>
            {request.message && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {request.message}
                </div>
            )}

            {state.requestedJsonSchemaText && (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {state.t('walletDialog.requestedJsonSchemaLabel')}
                    </p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 font-mono text-xs text-gray-700">
                        {state.requestedJsonSchemaText}
                    </pre>
                </div>
            )}

            {state.error && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </div>
            )}
        </>
    );
}

/**
 * Renders the optional connect-flow panels before the manual form.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogConnectPanels({ request, state }: WalletRecordDialogSectionProps) {
    return (
        <>
            {state.canUseGithubAppConnect && <WalletGithubAppConnectPanel state={state} />}
            {state.canUseCalendarOAuthConnect && (
                <WalletCalendarOAuthConnectPanel request={request} state={state} />
            )}
        </>
    );
}

/**
 * Renders the GitHub App connect call-to-action.
 *
 * @private function of WalletRecordDialog
 */
function WalletGithubAppConnectPanel({ state }: { readonly state: WalletRecordDialogState }) {
    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={state.handleGithubAppConnect}
                disabled={state.isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Github className="h-4 w-4" />
                {state.t('walletDialog.connectGithubAction')}
            </button>

            {!state.isManualTokenVisible && (
                <WalletManualTokenButton
                    isDisabled={state.isSubmitting}
                    onClick={state.handleOpenManualFields}
                    label={state.t('walletDialog.addTokenManuallyAction')}
                />
            )}
        </div>
    );
}

/**
 * Renders the Calendar OAuth connect call-to-action and request details.
 *
 * @private function of WalletRecordDialog
 */
function WalletCalendarOAuthConnectPanel({ request, state }: WalletRecordDialogSectionProps) {
    return (
        <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
            <div className="space-y-1 text-xs text-blue-900">
                <p className="font-semibold uppercase tracking-wide">
                    {state.t('walletDialog.calendarAccessTitle')}
                </p>
                <p>
                    {state.t('walletDialog.calendarUrlLabel')}{' '}
                    <span className="font-mono break-all">
                        {request.calendarOAuth?.calendarUrl || state.calendarConnectDetails.calendarUrl}
                    </span>
                </p>
                <p className="font-semibold uppercase tracking-wide pt-1">
                    {state.t('walletDialog.calendarScopesLabel')}
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                    {state.calendarConnectDetails.scopes.map((scope) => (
                        <li key={scope} className="font-mono break-all">
                            {scope}
                        </li>
                    ))}
                </ul>
                <p className="font-semibold uppercase tracking-wide pt-1">
                    {state.t('walletDialog.calendarExamplesLabel')}
                </p>
                <p>{state.t('walletDialog.calendarExamplesDescription')}</p>
            </div>

            <button
                type="button"
                onClick={state.handleCalendarOAuthConnect}
                disabled={state.isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Calendar className="h-4 w-4" />
                {state.t('walletDialog.connectCalendarAction')}
            </button>

            {!state.isManualTokenVisible && (
                <WalletManualTokenButton
                    isDisabled={state.isSubmitting}
                    onClick={state.handleOpenManualFields}
                    label={state.t('walletDialog.addTokenManuallyAction')}
                />
            )}
        </div>
    );
}

/**
 * Reusable button that switches from connect mode to manual token entry.
 *
 * @private function of WalletRecordDialog
 */
function WalletManualTokenButton({ isDisabled, onClick, label }: WalletManualTokenButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <KeyRound className="h-4 w-4" />
            {label}
        </button>
    );
}

/**
 * Renders the manual credential form once manual fields are visible.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogManualSection({
    state,
    serviceInputId,
    keyInputId,
}: WalletRecordDialogManualSectionProps) {
    return (
        <>
            {state.isUseProjectGithubManualInstructionsVisible && (
                <GithubManualTokenInstructions
                    title={state.t('walletDialog.githubManualInstructionsTitle')}
                    stepOne={state.t('walletDialog.githubManualStepOne')}
                    openSettingsLabel={state.t('walletDialog.githubManualOpenSettingsLinkLabel')}
                    stepTwo={state.t('walletDialog.githubManualStepTwo')}
                    openDocsLabel={state.t('walletDialog.githubManualOpenDocsLinkLabel')}
                    stepThree={state.t('walletDialog.githubManualStepThree')}
                    stepFour={state.t('walletDialog.githubManualStepFour')}
                />
            )}

            <WalletRecordDialogIdentityFields
                state={state}
                serviceInputId={serviceInputId}
                keyInputId={keyInputId}
            />
            <WalletRecordDialogCredentialFields state={state} />
            <WalletRecordDialogScopeFields state={state} />
            <WalletRecordDialogActions state={state} />
        </>
    );
}

/**
 * Renders the record type, service, and key controls.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogIdentityFields({
    state,
    serviceInputId,
    keyInputId,
}: WalletRecordDialogManualSectionProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {state.t('walletDialog.typeLabel')}
                </label>
                <select
                    value={state.formState.recordType}
                    onChange={(event) =>
                        state.updateFormState('recordType', event.target.value as WalletRecordType)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                    <option value="ACCESS_TOKEN">{state.t('walletDialog.accessTokenOption')}</option>
                    <option value="USERNAME_PASSWORD">
                        {state.t('walletDialog.usernamePasswordOption')}
                    </option>
                    <option value="SESSION_COOKIE">{state.t('walletDialog.sessionCookieOption')}</option>
                </select>
            </div>

            <div>
                <label
                    htmlFor={serviceInputId}
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                    {state.t('walletDialog.serviceLabel')}
                </label>
                <input
                    id={serviceInputId}
                    value={state.formState.service}
                    onChange={(event) => state.updateFormState('service', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
            </div>

            <div>
                <label
                    htmlFor={keyInputId}
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                    {state.t('walletDialog.keyLabel')}
                </label>
                <input
                    id={keyInputId}
                    value={state.formState.key}
                    onChange={(event) => state.updateFormState('key', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
            </div>
        </div>
    );
}

/**
 * Chooses the credential editor for the currently selected record type.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogCredentialFields({ state }: { readonly state: WalletRecordDialogState }) {
    switch (state.formState.recordType) {
        case 'USERNAME_PASSWORD':
            return <WalletRecordDialogUsernamePasswordFields state={state} />;
        case 'SESSION_COOKIE':
            return <WalletRecordDialogSessionCookieField state={state} />;
        case 'ACCESS_TOKEN':
            return <WalletRecordDialogAccessTokenField state={state} />;
        default:
            return null;
    }
}

/**
 * Renders username and password inputs.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogUsernamePasswordFields({
    state,
}: {
    readonly state: WalletRecordDialogState;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
                <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <UserRound className="h-3 w-3" />
                    {state.t('walletDialog.usernameLabel')}
                </span>
                <input
                    value={state.formState.username}
                    onChange={(event) => state.updateFormState('username', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
            </label>

            <label className="text-sm text-gray-700">
                <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Lock className="h-3 w-3" />
                    {state.t('walletDialog.passwordLabel')}
                </span>
                <SecretInput
                    value={state.formState.password}
                    onChange={(event) => state.updateFormState('password', event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
            </label>
        </div>
    );
}

/**
 * Renders the access-token editor.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogAccessTokenField({
    state,
}: {
    readonly state: WalletRecordDialogState;
}) {
    return (
        <div className="space-y-3">
            <SecretTextarea
                label={state.t('walletDialog.secretLabel')}
                value={state.formState.secret}
                onChange={(event) => state.updateFormState('secret', event.target.value)}
                placeholder={
                    state.isUseEmailSmtpWalletRequest
                        ? USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE
                        : state.t('walletDialog.secretPlaceholder')
                }
                helperText={
                    state.isUseEmailSmtpWalletRequest
                        ? state.t('walletDialog.secretHelperText')
                        : undefined
                }
                containerClassName="text-sm text-gray-700"
            />
        </div>
    );
}

/**
 * Renders the session-cookie editor.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogSessionCookieField({
    state,
}: {
    readonly state: WalletRecordDialogState;
}) {
    return (
        <label className="text-sm text-gray-700">
            <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Lock className="h-3 w-3" />
                {state.t('walletDialog.cookiesLabel')}
            </span>
            <textarea
                value={state.formState.cookies}
                onChange={(event) => state.updateFormState('cookies', event.target.value)}
                className="min-h-[90px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
        </label>
    );
}

/**
 * Renders user/agent scope checkboxes.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogScopeFields({ state }: { readonly state: WalletRecordDialogState }) {
    return (
        <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                    type="checkbox"
                    checked={state.formState.isUserScoped}
                    onChange={(event) => state.updateFormState('isUserScoped', event.target.checked)}
                />
                {state.t('walletDialog.scopeToUserLabel')}
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                    type="checkbox"
                    checked={!state.formState.isGlobal}
                    onChange={(event) => state.updateFormState('isGlobal', !event.target.checked)}
                />
                {state.t('walletDialog.scopeToAgentLabel')}
            </label>
        </div>
    );
}

/**
 * Renders the footer cancel/save actions for the manual form.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogActions({ state }: { readonly state: WalletRecordDialogState }) {
    return (
        <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={state.requestClose}
                disabled={state.isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {state.t('walletDialog.cancelLabel')}
            </button>
            <button
                type="submit"
                disabled={Boolean(state.validationError) || state.isSubmitting}
                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Save className="h-4 w-4" />
                {state.t('walletDialog.saveAction')}
            </button>
        </div>
    );
}

/**
 * Step-by-step guide shown when USE PROJECT falls back to manual GitHub token entry.
 *
 * @private function of WalletRecordDialog
 */
function GithubManualTokenInstructions({
    title,
    stepOne,
    openSettingsLabel,
    stepTwo,
    openDocsLabel,
    stepThree,
    stepFour,
}: GithubManualTokenInstructionsProps) {
    return (
        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{title}</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-blue-950">
                <li>
                    {stepOne}{' '}
                    <WalletExternalInstructionLink href={GITHUB_FINE_GRAINED_TOKEN_SETTINGS_URL}>
                        {openSettingsLabel}
                    </WalletExternalInstructionLink>
                </li>
                <li>
                    {stepTwo}{' '}
                    <WalletExternalInstructionLink href={GITHUB_PERSONAL_ACCESS_TOKEN_DOCS_URL}>
                        {openDocsLabel}
                    </WalletExternalInstructionLink>
                </li>
                <li>{stepThree}</li>
                <li>{stepFour}</li>
            </ol>
        </div>
    );
}

/**
 * External link styling reused by wallet instruction callouts.
 *
 * @private function of WalletRecordDialog
 */
function WalletExternalInstructionLink({ href, children }: WalletExternalInstructionLinkProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-800"
        >
            {children}
        </a>
    );
}
