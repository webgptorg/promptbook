'use client';

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { useDirtyModalGuard } from '../../../components/utils/useDirtyModalGuard';
import { buildServerTablePrefix } from '../../../utils/buildServerTablePrefix';
import type { ChatFeedbackMode } from '../../../utils/chatFeedbackMode';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';
import { uploadFileToCdn } from '../../../utils/upload/uploadFileToCdn';
import type { ManagedServerEnvironment } from './useServersRegistryState';

/**
 * Confirmation text shown before leaving the page with pending edits.
 *
 * @private function of <ServersClient/>
 */
export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes, are you sure you want to leave this page?';

/**
 * Wizard row for one extra bootstrap user.
 *
 * @private function of <ServersClient/>
 */
export type WizardUser = {
    /**
     * Username stored in the new server.
     */
    username: string;

    /**
     * Plain-text password used for bootstrap.
     */
    password: string;

    /**
     * Whether the user should be created as an admin.
     */
    isAdmin: boolean;
};

/**
 * Settings persisted during the create-server bootstrap.
 *
 * @private function of <ServersClient/>
 */
type CreateServerInitialSettings = {
    /**
     * Initial UI language.
     */
    language: string;

    /**
     * Optional homepage markdown.
     */
    homepageMessage: string;

    /**
     * Feedback widget mode.
     */
    feedbackMode: ChatFeedbackMode;

    /**
     * Whether file attachments start enabled.
     */
    isFileAttachmentsEnabled: boolean;

    /**
     * Whether experimental PWA installation starts enabled.
     */
    isExperimentalPwaAppEnabled: boolean;

    /**
     * Whether the shared footer starts visible.
     */
    isFooterShown: boolean;
};

/**
 * Client-side create-server form state.
 *
 * @private function of <ServersClient/>
 */
export type CreateServerWizardState = {
    /**
     * Friendly unique server name.
     */
    name: string;

    /**
     * Safe slug derived from the server name.
     */
    identifier: string;

    /**
     * Environment group used by migrations and operations.
     */
    environment: ManagedServerEnvironment;

    /**
     * Public domain assigned to the new server.
     */
    domain: string;

    /**
     * Optional uploaded icon URL.
     */
    iconUrl: string;

    /**
     * Installer-managed admin account.
     */
    adminUser: {
        username: string;
        password: string;
    };

    /**
     * Optional extra bootstrap users.
     */
    additionalUsers: WizardUser[];

    /**
     * Initial metadata values.
     */
    initialSettings: CreateServerInitialSettings;
};

/**
 * Error payload shown when create-server setup fails.
 *
 * @private function of <ServersClient/>
 */
export type CreateServerWizardError = {
    /**
     * Human-readable failure message.
     */
    message: string;

    /**
     * Optional SQL dump for manual recovery.
     */
    sqlDump: string | null;

    /**
     * Suggested dump filename.
     */
    sqlFilename: string | null;
};

/**
 * Top-level wizard-field updater shared with the dialog component.
 *
 * @private function of <ServersClient/>
 */
export type UpdateCreateServerWizardField = <
    TFieldName extends keyof Pick<CreateServerWizardState, 'name' | 'domain' | 'iconUrl'>,
>(
    fieldName: TFieldName,
    value: CreateServerWizardState[TFieldName],
) => void;

/**
 * Hook options used to coordinate post-create refresh behavior.
 *
 * @private function of <ServersClient/>
 */
type UseCreateServerWizardOptions = {
    /**
     * Reloads the registry after the server has been created.
     */
    readonly onServerCreated: () => Promise<void>;
};

/**
 * Result returned by `useCreateServerWizard`.
 *
 * @private function of <ServersClient/>
 */
type UseCreateServerWizardResult = {
    /**
     * Persists the wizard as a new registered server.
     */
    readonly handleCreateServer: () => Promise<void>;

    /**
     * Uploads a server icon and stores the resulting URL.
     */
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;

    /**
     * Hidden file input used for icon uploads.
     */
    readonly iconInputRef: RefObject<HTMLInputElement | null>;

    /**
     * Whether the wizard is currently creating a server.
     */
    readonly isCreatingServer: boolean;

    /**
     * Whether the dialog is currently open.
     */
    readonly isDialogOpen: boolean;

    /**
     * Whether the wizard contains unsaved values.
     */
    readonly isDirty: boolean;

    /**
     * Whether the icon upload is in progress.
     */
    readonly isUploadingIcon: boolean;

    /**
     * Opens the dialog with a fresh wizard state.
     */
    readonly openDialog: () => void;

    /**
     * Closes the dialog while respecting the dirty-state guard.
     */
    readonly requestClose: () => void;

    /**
     * Resets the dialog state to its initial values.
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
 * Creates the initial create-server wizard state.
 *
 * @returns Fresh wizard state.
 */
function createInitialWizardState(): CreateServerWizardState {
    return {
        name: '',
        identifier: '',
        environment: 'PRODUCTION',
        domain: '',
        iconUrl: '',
        adminUser: {
            username: 'admin',
            password: '',
        },
        additionalUsers: [],
        initialSettings: {
            language: 'en',
            homepageMessage: '',
            feedbackMode: 'stars',
            isFileAttachmentsEnabled: true,
            isExperimentalPwaAppEnabled: true,
            isFooterShown: true,
        },
    };
}

/**
 * Derives a URL-safe server identifier from the visible server name.
 *
 * @param name - Raw server name.
 * @returns Lowercase hyphenated identifier.
 */
function createServerIdentifierFromName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .replace(/-+/gu, '-');
}

/**
 * Safely derives the table-prefix preview for a wizard identifier.
 *
 * @param identifier - Raw wizard identifier.
 * @returns Derived table prefix or an empty string when the identifier is invalid.
 */
function deriveWizardTablePrefix(identifier: string): string {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
        return '';
    }

    try {
        return buildServerTablePrefix(trimmedIdentifier);
    } catch {
        return '';
    }
}

/**
 * Validates the simplified create-server wizard.
 *
 * @param wizardState - Current wizard form data.
 * @param derivedTablePrefix - Derived prefix preview for the generated identifier.
 * @returns User-facing validation message or `null` when valid.
 */
function getCreateServerWizardValidationMessage(
    wizardState: CreateServerWizardState,
    derivedTablePrefix: string,
): string | null {
    if (wizardState.name.trim() === '') {
        return 'Server name is required.';
    }
    if (wizardState.identifier.trim() === '' || !derivedTablePrefix) {
        return 'Server name must contain at least one letter or number.';
    }
    if (wizardState.domain.trim() === '') {
        return 'Server domain is required.';
    }

    return null;
}

/**
 * Returns whether the create-server wizard contains unsaved values.
 *
 * @param wizardState - Current wizard form state.
 * @returns `true` when any visible wizard field differs from its initial value.
 */
function hasCreateServerWizardChanges(wizardState: CreateServerWizardState): boolean {
    const initialWizardState = createInitialWizardState();

    return (
        wizardState.name !== initialWizardState.name ||
        wizardState.identifier !== initialWizardState.identifier ||
        wizardState.domain !== initialWizardState.domain ||
        wizardState.iconUrl !== initialWizardState.iconUrl
    );
}

/**
 * Encapsulates the simplified create-server dialog state and side effects.
 *
 * @param options - Hook options.
 * @returns Dialog state, derived values, and event handlers.
 *
 * @private internal hook of <ServersClient/>
 */
export function useCreateServerWizard(options: UseCreateServerWizardOptions): UseCreateServerWizardResult {
    const { onServerCreated } = options;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [wizardState, setWizardState] = useState<CreateServerWizardState>(createInitialWizardState);
    const [isCreatingServer, setIsCreatingServer] = useState(false);
    const [wizardError, setWizardError] = useState<CreateServerWizardError | null>(null);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const iconInputRef = useRef<HTMLInputElement | null>(null);

    const derivedWizardTablePrefix = useMemo(
        () => deriveWizardTablePrefix(wizardState.identifier),
        [wizardState.identifier],
    );
    const isDirty = useMemo(() => hasCreateServerWizardChanges(wizardState), [wizardState]);

    const resetWizard = useCallback(() => {
        setWizardState(createInitialWizardState());
        setWizardError(null);

        if (iconInputRef.current) {
            iconInputRef.current.value = '';
        }
    }, []);

    const closeDialog = useCallback(() => {
        resetWizard();
        setIsDialogOpen(false);
    }, [resetWizard]);

    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges: isDirty,
        isCloseBlocked: isCreatingServer || isUploadingIcon,
        onClose: closeDialog,
        message: UNSAVED_CHANGES_MESSAGE,
    });

    const openDialog = useCallback(() => {
        resetWizard();
        setIsDialogOpen(true);
    }, [resetWizard]);

    const updateWizardField = useCallback<UpdateCreateServerWizardField>((fieldName, value) => {
        setWizardState((previous) => {
            if (fieldName === 'name') {
                return {
                    ...previous,
                    name: value,
                    identifier: createServerIdentifierFromName(value),
                };
            }

            return {
                ...previous,
                [fieldName]: value,
            };
        });
    }, []);

    const handleIconUpload = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            try {
                setIsUploadingIcon(true);
                setWizardError(null);

                const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';
                const normalizedFilename = normalizeUploadFilename(file.name);
                const uploadPath = pathPrefix
                    ? `${pathPrefix}/user/files/${normalizedFilename}`
                    : `user/files/${normalizedFilename}`;

                const blob = await uploadFileToCdn({
                    pathname: getSafeCdnPath({ pathname: uploadPath }),
                    file,
                    purpose: 'SERVER_ICON',
                    contentType: file.type,
                });

                updateWizardField('iconUrl', blob.url);
            } catch (uploadError) {
                setWizardError({
                    message: uploadError instanceof Error ? uploadError.message : 'Failed to upload the server icon.',
                    sqlDump: null,
                    sqlFilename: null,
                });
            } finally {
                setIsUploadingIcon(false);
                if (iconInputRef.current) {
                    iconInputRef.current.value = '';
                }
            }
        },
        [updateWizardField],
    );

    const handleCreateServer = useCallback(async () => {
        const validationMessage = getCreateServerWizardValidationMessage(wizardState, derivedWizardTablePrefix);
        if (validationMessage) {
            await showAlert({
                title: 'Create server',
                message: validationMessage,
            }).catch(() => undefined);
            return;
        }

        try {
            setIsCreatingServer(true);
            setWizardError(null);

            const response = await fetch('/api/admin/servers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...wizardState,
                    tablePrefix: derivedWizardTablePrefix,
                }),
            });
            const payload = (await response.json()) as {
                error?: string;
                sqlDump?: string | null;
                sqlFilename?: string | null;
            };

            if (!response.ok) {
                setWizardError({
                    message: payload.error || 'Failed to create the server.',
                    sqlDump: payload.sqlDump || null,
                    sqlFilename: payload.sqlFilename || null,
                });
                return;
            }

            closeDialog();
            await onServerCreated();
        } catch (createError) {
            setWizardError({
                message: createError instanceof Error ? createError.message : 'Failed to create the server.',
                sqlDump: null,
                sqlFilename: null,
            });
        } finally {
            setIsCreatingServer(false);
        }
    }, [closeDialog, derivedWizardTablePrefix, onServerCreated, wizardState]);

    return {
        handleCreateServer,
        handleIconUpload,
        iconInputRef,
        isCreatingServer,
        isDialogOpen,
        isDirty,
        isUploadingIcon,
        openDialog,
        requestClose,
        resetWizard,
        updateWizardField,
        wizardError,
        wizardState,
    };
}
