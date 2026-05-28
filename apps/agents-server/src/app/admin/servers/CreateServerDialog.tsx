'use client';

import { Loader2, Plus, Upload, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { Dialog } from '../../../components/Portal/Dialog';
import {
    type CreateServerWizardError,
    type CreateServerWizardState,
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
 * Props consumed by `CreateServerDialog`.
 *
 * @private function of <ServersClient/>
 */
type CreateServerDialogProps = {
    /**
     * Persists the current wizard as a new server.
     */
    readonly handleCreateServer: () => Promise<void>;

    /**
     * Handles icon file selection.
     */
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;

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
     * Requests closing the dialog while respecting the dirty-state guard.
     */
    readonly requestClose: () => void;

    /**
     * Resets the wizard state to its initial values.
     */
    readonly resetWizard: () => void;

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
 * Renders the visible fields of the simplified create-server flow.
 *
 * @param props - Form props.
 * @returns Simplified server setup form.
 */
function CreateServerForm(props: {
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
    readonly iconInputRef: RefObject<HTMLInputElement | null>;
    readonly isUploadingIcon: boolean;
    readonly updateWizardField: UpdateCreateServerWizardField;
    readonly wizardState: CreateServerWizardState;
}) {
    const { handleIconUpload, iconInputRef, isUploadingIcon, updateWizardField, wizardState } = props;

    return (
        <div className="space-y-5">
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

            <div>
                <label htmlFor="create-server-icon-url" className="mb-1 block text-sm font-medium text-gray-700">
                    Server icon
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        id="create-server-icon-url"
                        type="text"
                        value={wizardState.iconUrl}
                        onChange={(event) => updateWizardField('iconUrl', event.target.value)}
                        className={INPUT_CLASS_NAME}
                        placeholder="Optional icon URL"
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
                        {isUploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
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
                ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">Admin user exists</p>
                <p className="mt-1">
                    The installer-created <span className="font-mono">admin</span> user is used for this server.
                </p>
            </div>
        </div>
    );
}

/**
 * Renders the simplified create-server dialog.
 *
 * @param props - Dialog props.
 * @returns Modal dialog when open, otherwise `null`.
 *
 * @private helper component of <ServersClient/>
 */
export function CreateServerDialog(props: CreateServerDialogProps) {
    const {
        handleCreateServer,
        handleIconUpload,
        iconInputRef,
        isCreatingServer,
        isOpen,
        isUploadingIcon,
        requestClose,
        resetWizard,
        updateWizardField,
        wizardError,
        wizardState,
    } = props;

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog onClose={requestClose} className="mx-4 w-full max-w-2xl overflow-hidden">
            <div className="max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Create new server</h2>
                        <p className="mt-1 text-sm text-gray-500">Add the public server identity and domain.</p>
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
                                        Send the dump to support@ptbk.io if manual recovery is needed.
                                    </span>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-red-700">
                                    If the issue persists, contact support@ptbk.io with the error details.
                                </p>
                            )}
                        </div>
                    ) : null}

                    <CreateServerForm
                        handleIconUpload={handleIconUpload}
                        iconInputRef={iconInputRef}
                        isUploadingIcon={isUploadingIcon}
                        updateWizardField={updateWizardField}
                        wizardState={wizardState}
                    />

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
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
