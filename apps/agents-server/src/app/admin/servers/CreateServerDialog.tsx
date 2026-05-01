'use client';

import { Loader2, Plus, Trash2, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { Dialog } from '../../../components/Portal/Dialog';
import { SecretInput } from '../../../components/SecretInput/SecretInput';
import { SERVER_LANGUAGE_OPTIONS } from '../../../languages/ServerLanguageRegistry';
import { CHAT_FEEDBACK_MODE_OPTIONS } from '../../../utils/chatFeedbackMode';
import { MANAGED_SERVER_ENVIRONMENT_OPTIONS } from './useServersRegistryState';
import {
    CREATE_SERVER_BOOLEAN_FEATURE_FLAGS,
    CREATE_SERVER_WIZARD_STEPS,
    type CreateServerWizardError,
    type CreateServerWizardState,
    type UpdateCreateServerAdditionalUser,
    type UpdateCreateServerAdminField,
    type UpdateCreateServerInitialSetting,
    type UpdateCreateServerWizardField,
} from './useCreateServerWizard';

/**
 * Shared input class used across the create-server dialog.
 *
 * @private function of <ServersClient/>
 */
const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

/**
 * Shared textarea class used across the create-server dialog.
 *
 * @private function of <ServersClient/>
 */
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[120px]`;

/**
 * Shared secondary button styling used by the create-server dialog.
 *
 * @private function of <ServersClient/>
 */
const SECONDARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Shared primary button styling used by the create-server dialog.
 *
 * @private function of <ServersClient/>
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Shared destructive button styling used by the create-server dialog.
 *
 * @private function of <ServersClient/>
 */
const DANGER_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Props consumed by `CreateServerDialog`.
 *
 * @private function of <ServersClient/>
 */
type CreateServerDialogProps = {
    /**
     * Adds a new optional bootstrap user row.
     */
    readonly addAdditionalUser: () => void;

    /**
     * Derived table-prefix preview for the current identifier.
     */
    readonly derivedWizardTablePrefix: string;

    /**
     * Persists the current wizard as a new server.
     */
    readonly handleCreateServer: () => Promise<void>;

    /**
     * Handles icon file selection.
     */
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;

    /**
     * Moves the wizard one step backward.
     */
    readonly handleWizardBack: () => void;

    /**
     * Moves the wizard one step forward.
     */
    readonly handleWizardNext: () => Promise<void>;

    /**
     * Jumps to a specific wizard step when allowed.
     */
    readonly handleWizardStepSelection: (nextStep: number) => Promise<void>;

    /**
     * Hidden file input reference used for icon uploads.
     */
    readonly iconInputRef: RefObject<HTMLInputElement | null>;

    /**
     * Whether the final create request is in progress.
     */
    readonly isCreatingServer: boolean;

    /**
     * Whether the dialog should currently be rendered.
     */
    readonly isOpen: boolean;

    /**
     * Whether the icon upload is in progress.
     */
    readonly isUploadingIcon: boolean;

    /**
     * Removes one optional bootstrap user row.
     */
    readonly removeAdditionalUser: (index: number) => void;

    /**
     * Requests closing the dialog while respecting the dirty-state guard.
     */
    readonly requestClose: () => void;

    /**
     * Resets the wizard state to its initial values.
     */
    readonly resetWizard: () => void;

    /**
     * Updates one optional bootstrap user row.
     */
    readonly updateAdditionalUser: UpdateCreateServerAdditionalUser;

    /**
     * Updates the required admin user fields.
     */
    readonly updateAdminUser: UpdateCreateServerAdminField;

    /**
     * Updates one initial settings field.
     */
    readonly updateInitialSetting: UpdateCreateServerInitialSetting;

    /**
     * Updates one top-level wizard field.
     */
    readonly updateWizardField: UpdateCreateServerWizardField;

    /**
     * Current create-server error payload.
     */
    readonly wizardError: CreateServerWizardError | null;

    /**
     * Current create-server form state.
     */
    readonly wizardState: CreateServerWizardState;

    /**
     * Current wizard step index.
     */
    readonly wizardStep: number;
};

/**
 * Props consumed by the profile-step helper.
 *
 * @private function of <ServersClient/>
 */
type CreateServerProfileStepProps = {
    readonly derivedWizardTablePrefix: string;
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
    readonly iconInputRef: RefObject<HTMLInputElement | null>;
    readonly isUploadingIcon: boolean;
    readonly updateWizardField: UpdateCreateServerWizardField;
    readonly wizardState: CreateServerWizardState;
};

/**
 * Props consumed by the users-step helper.
 *
 * @private function of <ServersClient/>
 */
type CreateServerUsersStepProps = {
    readonly addAdditionalUser: () => void;
    readonly removeAdditionalUser: (index: number) => void;
    readonly updateAdditionalUser: UpdateCreateServerAdditionalUser;
    readonly updateAdminUser: UpdateCreateServerAdminField;
    readonly wizardState: CreateServerWizardState;
};

/**
 * Props consumed by the settings-step helper.
 *
 * @private function of <ServersClient/>
 */
type CreateServerSettingsStepProps = {
    readonly derivedWizardTablePrefix: string;
    readonly updateInitialSetting: UpdateCreateServerInitialSetting;
    readonly wizardState: CreateServerWizardState;
};

/**
 * Downloads a text payload as a local file from the browser.
 *
 * @param filename - Suggested filename.
 * @param content - Text file content.
 */
function downloadTextFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
}

/**
 * Renders the profile step of the create-server wizard.
 *
 * @param props - Step props.
 * @returns Profile-step form fields.
 */
function CreateServerProfileStep(props: CreateServerProfileStepProps) {
    const {
        derivedWizardTablePrefix,
        handleIconUpload,
        iconInputRef,
        isUploadingIcon,
        updateWizardField,
        wizardState,
    } = props;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div>
                <label htmlFor="create-server-name" className="mb-1 block text-sm font-medium text-gray-700">
                    Server name
                </label>
                <input
                    id="create-server-name"
                    type="text"
                    value={wizardState.name}
                    onChange={(event) => updateWizardField('name', event.target.value)}
                    className={INPUT_CLASS_NAME}
                    placeholder="Acme Support"
                />
            </div>
            <div>
                <label htmlFor="create-server-identifier" className="mb-1 block text-sm font-medium text-gray-700">
                    Identifier / slug
                </label>
                <input
                    id="create-server-identifier"
                    type="text"
                    value={wizardState.identifier}
                    onChange={(event) => updateWizardField('identifier', event.target.value.toLowerCase())}
                    className={`${INPUT_CLASS_NAME} font-mono`}
                    placeholder="acme-support"
                />
                <p className="mt-1 text-xs text-gray-500">Use lowercase letters, numbers, and hyphens only.</p>
            </div>
            <div>
                <label htmlFor="create-server-table-prefix" className="mb-1 block text-sm font-medium text-gray-700">
                    Derived table prefix
                </label>
                <input
                    id="create-server-table-prefix"
                    type="text"
                    value={derivedWizardTablePrefix}
                    readOnly
                    className={`${INPUT_CLASS_NAME} bg-gray-50 font-mono text-gray-600`}
                    placeholder="server_AcmeSupport_"
                />
            </div>
            <div>
                <label htmlFor="create-server-environment" className="mb-1 block text-sm font-medium text-gray-700">
                    Environment
                </label>
                <select
                    id="create-server-environment"
                    value={wizardState.environment}
                    onChange={(event) =>
                        updateWizardField('environment', event.target.value as CreateServerWizardState['environment'])
                    }
                    className={INPUT_CLASS_NAME}
                >
                    {MANAGED_SERVER_ENVIRONMENT_OPTIONS.map((environment) => (
                        <option key={environment} value={environment}>
                            {environment}
                        </option>
                    ))}
                </select>
            </div>
            <div className="md:col-span-2">
                <label htmlFor="create-server-domain" className="mb-1 block text-sm font-medium text-gray-700">
                    Domain
                </label>
                <input
                    id="create-server-domain"
                    type="text"
                    value={wizardState.domain}
                    onChange={(event) => updateWizardField('domain', event.target.value)}
                    className={INPUT_CLASS_NAME}
                    placeholder="acme-support.ptbk.io"
                />
            </div>
            <div className="md:col-span-2">
                <label htmlFor="create-server-icon-url" className="mb-1 block text-sm font-medium text-gray-700">
                    Server icon
                </label>
                <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                        id="create-server-icon-url"
                        type="text"
                        value={wizardState.iconUrl}
                        onChange={(event) => updateWizardField('iconUrl', event.target.value)}
                        className={INPUT_CLASS_NAME}
                        placeholder="Leave blank to keep the default icon"
                    />
                    <input
                        ref={iconInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIconUpload}
                    />
                    <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        disabled={isUploadingIcon}
                        className={SECONDARY_BUTTON_CLASS_NAME}
                    >
                        {isUploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Upload icon
                    </button>
                </div>
                {wizardState.iconUrl ? (
                    <div className="mt-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={wizardState.iconUrl}
                            alt="Server icon preview"
                            className="h-16 w-16 rounded-lg object-cover"
                        />
                    </div>
                ) : (
                    <p className="mt-2 text-xs text-gray-500">
                        Leave the icon empty to keep the default branding assets.
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Renders the users step of the create-server wizard.
 *
 * @param props - Step props.
 * @returns User-step form fields.
 */
function CreateServerUsersStep(props: CreateServerUsersStepProps) {
    const { addAdditionalUser, removeAdditionalUser, updateAdditionalUser, updateAdminUser, wizardState } = props;

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Required admin user</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        This admin belongs to the new server itself, not necessarily to the creating user.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="create-server-admin-username"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Admin username
                        </label>
                        <input
                            id="create-server-admin-username"
                            type="text"
                            value={wizardState.adminUser.username}
                            onChange={(event) => updateAdminUser('username', event.target.value)}
                            className={INPUT_CLASS_NAME}
                            placeholder="admin"
                        />
                    </div>
                    <SecretInput
                        label="Admin password"
                        value={wizardState.adminUser.password}
                        onChange={(event) => updateAdminUser('password', event.target.value)}
                        placeholder="Required"
                        helperText="Password validation uses the same rules as the existing server admin flow."
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Additional users</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Optional bootstrap users created immediately after migrations finish.
                        </p>
                    </div>
                    <button type="button" onClick={addAdditionalUser} className={SECONDARY_BUTTON_CLASS_NAME}>
                        <Plus className="h-4 w-4" />
                        Add user
                    </button>
                </div>

                {wizardState.additionalUsers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                        No extra users will be created unless you add them here.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {wizardState.additionalUsers.map((user, index) => (
                            <div
                                key={`wizard-user-${index}`}
                                className="rounded-xl border border-gray-200 bg-white p-4"
                            >
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
                                    <div>
                                        <label
                                            htmlFor={`create-server-user-${index}-username`}
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Username
                                        </label>
                                        <input
                                            id={`create-server-user-${index}-username`}
                                            type="text"
                                            value={user.username}
                                            onChange={(event) =>
                                                updateAdditionalUser(index, 'username', event.target.value)
                                            }
                                            className={INPUT_CLASS_NAME}
                                            placeholder={`user-${index + 1}`}
                                        />
                                    </div>
                                    <SecretInput
                                        label="Password"
                                        value={user.password}
                                        onChange={(event) =>
                                            updateAdditionalUser(index, 'password', event.target.value)
                                        }
                                        placeholder="Required"
                                    />
                                    <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 lg:mt-7">
                                        <input
                                            type="checkbox"
                                            checked={user.isAdmin}
                                            onChange={(event) =>
                                                updateAdditionalUser(index, 'isAdmin', event.target.checked)
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Admin
                                    </label>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeAdditionalUser(index)}
                                            className={`${DANGER_BUTTON_CLASS_NAME} w-full justify-center lg:mt-7`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Renders the settings step of the create-server wizard.
 *
 * @param props - Step props.
 * @returns Settings-step form fields.
 */
function CreateServerSettingsStep(props: CreateServerSettingsStepProps) {
    const { derivedWizardTablePrefix, updateInitialSetting, wizardState } = props;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="create-server-language" className="mb-1 block text-sm font-medium text-gray-700">
                        Initial language
                    </label>
                    <select
                        id="create-server-language"
                        value={wizardState.initialSettings.language}
                        onChange={(event) => updateInitialSetting('language', event.target.value)}
                        className={INPUT_CLASS_NAME}
                    >
                        {SERVER_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Bootstrap summary</p>
                    <p className="mt-2">
                        The new server will be created as <strong>{wizardState.name || 'Unnamed server'}</strong> on{' '}
                        <strong>{wizardState.domain || 'pending domain'}</strong> with prefix{' '}
                        <code>{derivedWizardTablePrefix || 'pending prefix'}</code>.
                    </p>
                    <p className="mt-2">
                        Bootstrap users: <strong>{1 + wizardState.additionalUsers.length}</strong>
                    </p>
                </div>
                <div className="md:col-span-2">
                    <label
                        htmlFor="create-server-homepage-message"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Homepage message
                    </label>
                    <textarea
                        id="create-server-homepage-message"
                        value={wizardState.initialSettings.homepageMessage}
                        onChange={(event) => updateInitialSetting('homepageMessage', event.target.value)}
                        className={TEXTAREA_CLASS_NAME}
                        placeholder="Optional markdown shown on the new server homepage."
                    />
                </div>
                <div>
                    <label
                        htmlFor="create-server-feedback-mode"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Chat feedback mode
                    </label>
                    <select
                        id="create-server-feedback-mode"
                        value={wizardState.initialSettings.feedbackMode}
                        onChange={(event) =>
                            updateInitialSetting(
                                'feedbackMode',
                                event.target.value as CreateServerWizardState['initialSettings']['feedbackMode'],
                            )
                        }
                        className={INPUT_CLASS_NAME}
                    >
                        {CHAT_FEEDBACK_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {CREATE_SERVER_BOOLEAN_FEATURE_FLAGS.map((flag) => (
                    <label
                        key={flag.key}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                        <input
                            type="checkbox"
                            checked={wizardState.initialSettings[flag.key]}
                            onChange={(event) => updateInitialSetting(flag.key, event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{flag.title}</div>
                            <div className="mt-1 text-sm text-gray-500">{flag.description}</div>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}

/**
 * Renders the multi-step create-server dialog.
 *
 * @param props - Dialog props.
 * @returns Modal dialog when open, otherwise `null`.
 *
 * @private helper component of <ServersClient/>
 */
export function CreateServerDialog(props: CreateServerDialogProps) {
    const {
        addAdditionalUser,
        derivedWizardTablePrefix,
        handleCreateServer,
        handleIconUpload,
        handleWizardBack,
        handleWizardNext,
        handleWizardStepSelection,
        iconInputRef,
        isCreatingServer,
        isOpen,
        isUploadingIcon,
        removeAdditionalUser,
        requestClose,
        resetWizard,
        updateAdditionalUser,
        updateAdminUser,
        updateInitialSetting,
        updateWizardField,
        wizardError,
        wizardState,
        wizardStep,
    } = props;

    if (!isOpen) {
        return null;
    }

    const currentStepContent =
        wizardStep === 0 ? (
            <CreateServerProfileStep
                derivedWizardTablePrefix={derivedWizardTablePrefix}
                handleIconUpload={handleIconUpload}
                iconInputRef={iconInputRef}
                isUploadingIcon={isUploadingIcon}
                updateWizardField={updateWizardField}
                wizardState={wizardState}
            />
        ) : wizardStep === 1 ? (
            <CreateServerUsersStep
                addAdditionalUser={addAdditionalUser}
                removeAdditionalUser={removeAdditionalUser}
                updateAdditionalUser={updateAdditionalUser}
                updateAdminUser={updateAdminUser}
                wizardState={wizardState}
            />
        ) : (
            <CreateServerSettingsStep
                derivedWizardTablePrefix={derivedWizardTablePrefix}
                updateInitialSetting={updateInitialSetting}
                wizardState={wizardState}
            />
        );

    return (
        <Dialog onClose={requestClose} className="mx-4 w-full max-w-5xl overflow-hidden">
            <div className="max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Create new server</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Create a server with its initial users and settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Close create server dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 px-6 py-6">
                    <div className="grid gap-3 md:grid-cols-3">
                        {CREATE_SERVER_WIZARD_STEPS.map((step, index) => (
                            <button
                                key={step.title}
                                type="button"
                                onClick={() => void handleWizardStepSelection(index)}
                                className={`rounded-xl border p-4 text-left transition ${
                                    index === wizardStep
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                        : index < wizardStep
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="text-xs font-semibold uppercase tracking-wide">Step {index + 1}</div>
                                <div className="mt-1 text-base font-semibold">{step.title}</div>
                                <div className="mt-1 text-sm text-current/80">{step.description}</div>
                            </button>
                        ))}
                    </div>

                    {wizardError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <p className="font-semibold">Server creation failed</p>
                            <p className="mt-1 whitespace-pre-wrap">{wizardError.message}</p>
                            {wizardError.sqlDump && wizardError.sqlFilename ? (
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            downloadTextFile(
                                                wizardError.sqlFilename || 'create-server.sql',
                                                wizardError.sqlDump || '',
                                            )
                                        }
                                        className={SECONDARY_BUTTON_CLASS_NAME}
                                    >
                                        Download SQL dump
                                    </button>
                                    <span className="text-xs text-red-700">
                                        If you need manual recovery, send the dump to support@ptbk.io.
                                    </span>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-red-700">
                                    If the issue persists, contact support@ptbk.io with the error details.
                                </p>
                            )}
                        </div>
                    ) : null}

                    {currentStepContent}

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-gray-500">
                            If setup fails, you can download the SQL dump for manual recovery.
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={resetWizard}
                                disabled={isCreatingServer || isUploadingIcon}
                                className={SECONDARY_BUTTON_CLASS_NAME}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={handleWizardBack}
                                disabled={wizardStep === 0 || isCreatingServer}
                                className={SECONDARY_BUTTON_CLASS_NAME}
                            >
                                Back
                            </button>
                            {wizardStep < CREATE_SERVER_WIZARD_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => void handleWizardNext()}
                                    disabled={isCreatingServer || isUploadingIcon}
                                    className={PRIMARY_BUTTON_CLASS_NAME}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void handleCreateServer()}
                                    disabled={isCreatingServer || isUploadingIcon}
                                    className={PRIMARY_BUTTON_CLASS_NAME}
                                >
                                    {isCreatingServer ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Create server
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
