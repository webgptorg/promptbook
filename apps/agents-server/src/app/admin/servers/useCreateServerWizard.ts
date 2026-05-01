'use client';

import { upload } from '@vercel/blob/client';
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { useDirtyModalGuard } from '../../../components/utils/useDirtyModalGuard';
import { buildServerTablePrefix } from '../../../utils/buildServerTablePrefix';
import type { ChatFeedbackMode } from '../../../utils/chatFeedbackMode';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';
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
     * Safe slug used to derive the table prefix.
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
     * Mandatory first admin account.
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
    TFieldName extends keyof Pick<
        CreateServerWizardState,
        'name' | 'identifier' | 'environment' | 'domain' | 'iconUrl'
    >,
>(
    fieldName: TFieldName,
    value: CreateServerWizardState[TFieldName],
) => void;

/**
 * Admin-user updater shared with the dialog component.
 *
 * @private function of <ServersClient/>
 */
export type UpdateCreateServerAdminField = <TFieldName extends keyof CreateServerWizardState['adminUser']>(
    fieldName: TFieldName,
    value: CreateServerWizardState['adminUser'][TFieldName],
) => void;

/**
 * Initial-settings updater shared with the dialog component.
 *
 * @private function of <ServersClient/>
 */
export type UpdateCreateServerInitialSetting = <TFieldName extends keyof CreateServerWizardState['initialSettings']>(
    fieldName: TFieldName,
    value: CreateServerWizardState['initialSettings'][TFieldName],
) => void;

/**
 * Additional-user updater shared with the dialog component.
 *
 * @private function of <ServersClient/>
 */
export type UpdateCreateServerAdditionalUser = <TFieldName extends keyof WizardUser>(
    index: number,
    fieldName: TFieldName,
    value: WizardUser[TFieldName],
) => void;

/**
 * Step labels shown in the create-server wizard.
 *
 * @private function of <ServersClient/>
 */
export const CREATE_SERVER_WIZARD_STEPS = [
    {
        title: 'Profile',
        description: 'Name, identifier, environment, domain, and branding.',
    },
    {
        title: 'Users',
        description: 'Bootstrap admin credentials and optional extra users.',
    },
    {
        title: 'Settings',
        description: 'Language, homepage message, and initial feature flags.',
    },
] as const;

/**
 * Boolean settings rendered as checkbox cards in the final wizard step.
 *
 * @private function of <ServersClient/>
 */
type CreateServerBooleanFeatureFlagKey = keyof Pick<
    CreateServerInitialSettings,
    'isFileAttachmentsEnabled' | 'isExperimentalPwaAppEnabled' | 'isFooterShown'
>;

/**
 * Boolean feature flags exposed in the create-server wizard.
 *
 * @private function of <ServersClient/>
 */
export const CREATE_SERVER_BOOLEAN_FEATURE_FLAGS: ReadonlyArray<{
    readonly key: CreateServerBooleanFeatureFlagKey;
    readonly title: string;
    readonly description: string;
}> = [
    {
        key: 'isFileAttachmentsEnabled',
        title: 'File attachments enabled',
        description: 'Allow chat attachments on the new server.',
    },
    {
        key: 'isExperimentalPwaAppEnabled',
        title: 'PWA install enabled',
        description: 'Expose the experimental install-as-app option.',
    },
    {
        key: 'isFooterShown',
        title: 'Footer shown',
        description: 'Render the shared footer on public pages.',
    },
] as const;

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
     * Adds a new extra bootstrap user row.
     */
    readonly addAdditionalUser: () => void;

    /**
     * Derived table-prefix preview for the current identifier.
     */
    readonly derivedWizardTablePrefix: string;

    /**
     * Persists the wizard as a new registered server.
     */
    readonly handleCreateServer: () => Promise<void>;

    /**
     * Uploads a server icon and stores the resulting URL.
     */
    readonly handleIconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;

    /**
     * Moves the wizard one step backward.
     */
    readonly handleWizardBack: () => void;

    /**
     * Moves the wizard one step forward after validating the current step.
     */
    readonly handleWizardNext: () => Promise<void>;

    /**
     * Navigates to the requested wizard step with step validation.
     */
    readonly handleWizardStepSelection: (nextStep: number) => Promise<void>;

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
     * Removes one extra bootstrap user row.
     */
    readonly removeAdditionalUser: (index: number) => void;

    /**
     * Closes the dialog while respecting the dirty-state guard.
     */
    readonly requestClose: () => void;

    /**
     * Resets the dialog state to its initial values.
     */
    readonly resetWizard: () => void;

    /**
     * Updates one extra bootstrap user row.
     */
    readonly updateAdditionalUser: UpdateCreateServerAdditionalUser;

    /**
     * Updates the required admin-user fields.
     */
    readonly updateAdminUser: UpdateCreateServerAdminField;

    /**
     * Updates one initial setting field.
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
 * Creates an empty extra-user row for the create-server wizard.
 *
 * @returns Fresh extra-user draft.
 */
function createEmptyWizardUser(): WizardUser {
    return {
        username: '',
        password: '',
        isAdmin: false,
    };
}

/**
 * Creates the initial create-server wizard state.
 *
 * @returns Fresh wizard state.
 */
function createInitialWizardState(): CreateServerWizardState {
    return {
        name: '',
        identifier: '',
        environment: 'PREVIEW',
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
 * Validates the create-server wizard up to the requested step.
 *
 * @param wizardState - Current wizard form data.
 * @param derivedTablePrefix - Derived prefix preview for the current identifier.
 * @param upToStep - Highest wizard step that must be valid.
 * @returns User-facing validation message or `null` when valid.
 */
function getCreateServerWizardValidationMessage(
    wizardState: CreateServerWizardState,
    derivedTablePrefix: string,
    upToStep: number,
): string | null {
    if (upToStep >= 0) {
        if (wizardState.name.trim() === '') {
            return 'Server name is required.';
        }
        if (wizardState.identifier.trim() === '') {
            return 'Server identifier is required.';
        }
        if (!derivedTablePrefix) {
            return 'Server identifier must contain only lowercase letters, numbers, and hyphens.';
        }
        if (wizardState.domain.trim() === '') {
            return 'Server domain is required.';
        }
    }

    if (upToStep >= 1) {
        if (wizardState.adminUser.username.trim() === '') {
            return 'Admin username is required.';
        }
        if (wizardState.adminUser.password === '') {
            return 'Admin password is required.';
        }

        const seenUsernames = new Set<string>([wizardState.adminUser.username.trim().toLowerCase()]);
        for (const [index, user] of wizardState.additionalUsers.entries()) {
            if (user.username.trim() === '') {
                return `Additional user ${index + 1} must have a username.`;
            }
            if (user.password === '') {
                return `Additional user ${index + 1} must have a password.`;
            }

            const normalizedUsername = user.username.trim().toLowerCase();
            if (seenUsernames.has(normalizedUsername)) {
                return `Username "${user.username.trim()}" is duplicated in the bootstrap users list.`;
            }
            seenUsernames.add(normalizedUsername);
        }
    }

    if (upToStep >= 2 && wizardState.initialSettings.language.trim() === '') {
        return 'Initial language is required.';
    }

    return null;
}

/**
 * Returns whether the create-server wizard contains unsaved values.
 *
 * @param wizardState - Current wizard form state.
 * @returns `true` when any wizard field differs from its initial value.
 */
function hasCreateServerWizardChanges(wizardState: CreateServerWizardState): boolean {
    const initialWizardState = createInitialWizardState();

    if (
        wizardState.name !== initialWizardState.name ||
        wizardState.identifier !== initialWizardState.identifier ||
        wizardState.environment !== initialWizardState.environment ||
        wizardState.domain !== initialWizardState.domain ||
        wizardState.iconUrl !== initialWizardState.iconUrl ||
        wizardState.adminUser.username !== initialWizardState.adminUser.username ||
        wizardState.adminUser.password !== initialWizardState.adminUser.password ||
        wizardState.initialSettings.language !== initialWizardState.initialSettings.language ||
        wizardState.initialSettings.homepageMessage !== initialWizardState.initialSettings.homepageMessage ||
        wizardState.initialSettings.feedbackMode !== initialWizardState.initialSettings.feedbackMode ||
        wizardState.initialSettings.isFileAttachmentsEnabled !==
            initialWizardState.initialSettings.isFileAttachmentsEnabled ||
        wizardState.initialSettings.isExperimentalPwaAppEnabled !==
            initialWizardState.initialSettings.isExperimentalPwaAppEnabled ||
        wizardState.initialSettings.isFooterShown !== initialWizardState.initialSettings.isFooterShown
    ) {
        return true;
    }

    if (wizardState.additionalUsers.length !== initialWizardState.additionalUsers.length) {
        return true;
    }

    return wizardState.additionalUsers.some((user) => user.username !== '' || user.password !== '' || user.isAdmin);
}

/**
 * Encapsulates the multi-step create-server dialog state and side effects.
 *
 * @param options - Hook options.
 * @returns Dialog state, derived values, and event handlers.
 *
 * @private internal hook of <ServersClient/>
 */
export function useCreateServerWizard(options: UseCreateServerWizardOptions): UseCreateServerWizardResult {
    const { onServerCreated } = options;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
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
        setWizardStep(0);
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
        setWizardState((previous) => ({
            ...previous,
            [fieldName]: value,
        }));
    }, []);

    const updateAdminUser = useCallback<UpdateCreateServerAdminField>((fieldName, value) => {
        setWizardState((previous) => ({
            ...previous,
            adminUser: {
                ...previous.adminUser,
                [fieldName]: value,
            },
        }));
    }, []);

    const updateInitialSetting = useCallback<UpdateCreateServerInitialSetting>((fieldName, value) => {
        setWizardState((previous) => ({
            ...previous,
            initialSettings: {
                ...previous.initialSettings,
                [fieldName]: value,
            },
        }));
    }, []);

    const updateAdditionalUser = useCallback<UpdateCreateServerAdditionalUser>((index, fieldName, value) => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: previous.additionalUsers.map((user, userIndex) =>
                userIndex === index ? { ...user, [fieldName]: value } : user,
            ),
        }));
    }, []);

    const addAdditionalUser = useCallback(() => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: [...previous.additionalUsers, createEmptyWizardUser()],
        }));
    }, []);

    const removeAdditionalUser = useCallback((index: number) => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: previous.additionalUsers.filter((_, userIndex) => userIndex !== index),
        }));
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

                const blob = await upload(getSafeCdnPath({ pathname: uploadPath }), file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                    clientPayload: JSON.stringify({
                        purpose: 'SERVER_ICON',
                        contentType: file.type,
                    }),
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
        const validationMessage = getCreateServerWizardValidationMessage(
            wizardState,
            derivedWizardTablePrefix,
            CREATE_SERVER_WIZARD_STEPS.length - 1,
        );
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

    const handleWizardBack = useCallback(() => {
        setWizardStep((previous) => Math.max(0, previous - 1));
    }, []);

    const handleWizardNext = useCallback(async () => {
        const validationMessage = getCreateServerWizardValidationMessage(
            wizardState,
            derivedWizardTablePrefix,
            wizardStep,
        );
        if (validationMessage) {
            await showAlert({
                title: 'Create server',
                message: validationMessage,
            }).catch(() => undefined);
            return;
        }

        setWizardStep((previous) => Math.min(CREATE_SERVER_WIZARD_STEPS.length - 1, previous + 1));
    }, [derivedWizardTablePrefix, wizardState, wizardStep]);

    const handleWizardStepSelection = useCallback(
        async (nextStep: number) => {
            if (nextStep <= wizardStep) {
                setWizardStep(nextStep);
                return;
            }

            const validationMessage = getCreateServerWizardValidationMessage(
                wizardState,
                derivedWizardTablePrefix,
                wizardStep,
            );
            if (validationMessage) {
                await showAlert({
                    title: 'Create server',
                    message: validationMessage,
                }).catch(() => undefined);
                return;
            }

            setWizardStep(nextStep);
        },
        [derivedWizardTablePrefix, wizardState, wizardStep],
    );

    return {
        addAdditionalUser,
        derivedWizardTablePrefix,
        handleCreateServer,
        handleIconUpload,
        handleWizardBack,
        handleWizardNext,
        handleWizardStepSelection,
        iconInputRef,
        isCreatingServer,
        isDialogOpen,
        isDirty,
        isUploadingIcon,
        openDialog,
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
    };
}
