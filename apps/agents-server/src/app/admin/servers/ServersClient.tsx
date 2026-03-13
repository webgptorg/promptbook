'use client';

import moment from 'moment';
import { upload } from '@vercel/blob/client';
import { ArrowRightLeft, Loader2, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { showAlert, showConfirm, showPrompt } from '../../../components/AsyncDialogs/asyncDialogs';
import { Card } from '../../../components/Homepage/Card';
import { Section } from '../../../components/Homepage/Section';
import { Dialog } from '../../../components/Portal/Dialog';
import { SecretInput } from '../../../components/SecretInput/SecretInput';
import { useDirtyModalGuard } from '../../../components/utils/useDirtyModalGuard';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { buildServerTablePrefix } from '../../../utils/buildServerTablePrefix';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';

/**
 * Server registry row returned by the admin servers API.
 */
type ManagedServerRow = {
    /**
     * Database identifier.
     */
    readonly id: number;
    /**
     * Unique server name.
     */
    readonly name: string;
    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: 'PRODUCTION' | 'PREVIEW';
    /**
     * Public domain assigned to the server.
     */
    readonly domain: string;
    /**
     * Prefix used by the server-specific tables.
     */
    readonly tablePrefix: string;
    /**
     * Creation timestamp.
     */
    readonly createdAt: string;
    /**
     * Last update timestamp.
     */
    readonly updatedAt: string;
};

/**
 * Response payload returned by `GET /api/admin/servers`.
 */
type ManagedServersResponse = {
    /**
     * Registered servers ordered by name.
     */
    readonly servers: ReadonlyArray<ManagedServerRow>;
    /**
     * Server resolved from the current request domain.
     */
    readonly currentServerId: number | null;
};

/**
 * Editable draft state for one registry row.
 */
type ServerDraft = {
    /**
     * Friendly unique server name.
     */
    name: string;
    /**
     * Environment group used by migrations and operations.
     */
    environment: ManagedServerRow['environment'];
    /**
     * Public domain assigned to the server.
     */
    domain: string;
    /**
     * Prefix used by the server-specific tables.
     */
    tablePrefix: string;
};

/**
 * Wizard row for one extra bootstrap user.
 */
type WizardUser = {
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
 * Client-side create-server form state.
 */
type CreateServerWizardState = {
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
    environment: ManagedServerRow['environment'];
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
    initialSettings: {
        language: string;
        homepageMessage: string;
        isFeedbackEnabled: boolean;
        isFileAttachmentsEnabled: boolean;
        isExperimentalPwaAppEnabled: boolean;
        isFooterShown: boolean;
    };
};

/**
 * Shared input class used across the servers admin UI.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

/**
 * Shared textarea class used across the servers admin UI.
 */
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[120px]`;

/**
 * Shared secondary button styling.
 */
const SECONDARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Shared primary button styling.
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Shared destructive button styling.
 */
const DANGER_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Step labels shown in the create-server wizard.
 */
const CREATE_SERVER_WIZARD_STEPS = [
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
 * Language presets exposed by the wizard.
 */
const SERVER_LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'cs', label: 'Czech' },
] as const;

/**
 * Feature flags exposed in the create-server wizard.
 */
const CREATE_SERVER_FEATURE_FLAGS = [
    {
        key: 'isFeedbackEnabled',
        title: 'Feedback enabled',
        description: 'Show chat feedback and store feedback records.',
    },
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
 * Confirmation text shown before leaving the page with pending edits.
 */
const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes, are you sure you want to leave this page?';

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
            isFeedbackEnabled: true,
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
 * Formats an ISO timestamp into a compact local string.
 *
 * @param value - ISO timestamp.
 * @returns Human-readable local timestamp.
 */
function formatDateTime(value: string): string {
    if (!value) {
        return 'N/A';
    }

    const timestamp = moment(value);
    return timestamp.isValid() ? timestamp.format('YYYY-MM-DD HH:mm:ss') : 'N/A';
}

/**
 * Builds a public base URL for one managed server row.
 *
 * @param server - Registry row to resolve.
 * @returns Public URL string.
 */
function createServerPublicUrl(server: Pick<ManagedServerRow, 'domain'>): string {
    const protocol = server.domain.startsWith('localhost') || server.domain.startsWith('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${server.domain}`;
}

/**
 * Builds the dashboard URL for one managed server row.
 *
 * @param server - Registry row to open.
 * @returns Dashboard URL string.
 */
function createServerDashboardUrl(server: Pick<ManagedServerRow, 'domain'>): string {
    return new URL('/dashboard', createServerPublicUrl(server)).href;
}

/**
 * Clones one persisted server row into an editable draft.
 *
 * @param server - Persisted registry row.
 * @returns Editable draft state.
 */
function createServerDraftFromRow(server: ManagedServerRow): ServerDraft {
    return {
        name: server.name,
        environment: server.environment,
        domain: server.domain,
        tablePrefix: server.tablePrefix,
    };
}

/**
 * Returns whether one draft differs from its persisted server row.
 *
 * @param server - Persisted registry row.
 * @param draft - Editable row draft.
 * @returns `true` when the draft contains unsaved changes.
 */
function isServerDraftDifferent(server: ManagedServerRow, draft: ServerDraft | undefined): boolean {
    if (!draft) {
        return false;
    }

    return (
        draft.name !== server.name ||
        draft.environment !== server.environment ||
        draft.domain !== server.domain ||
        draft.tablePrefix !== server.tablePrefix
    );
}

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
        wizardState.initialSettings.isFeedbackEnabled !== initialWizardState.initialSettings.isFeedbackEnabled ||
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

    return wizardState.additionalUsers.some(
        (user) => user.username !== '' || user.password !== '' || user.isAdmin !== false,
    );
}

/**
 * Renders a small status badge used in the servers table and details panel.
 *
 * @param props - Badge label and tone.
 * @returns Badge element.
 */
function ServerStatusBadge(props: {
    readonly label: string;
    readonly tone: 'blue' | 'amber' | 'green' | 'gray';
}) {
    const className =
        props.tone === 'blue'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : props.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : props.tone === 'green'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-gray-50 text-gray-600';

    return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{props.label}</span>;
}

/**
 * Global-admin UI for managing same-instance registered servers.
 */
export function ServersClient() {
    const [servers, setServers] = useState<ManagedServerRow[]>([]);
    const [serverDrafts, setServerDrafts] = useState<Record<number, ServerDraft>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentServerId, setCurrentServerId] = useState<number | null>(null);
    const [savingServerId, setSavingServerId] = useState<number | null>(null);
    const [navigatingServerId, setNavigatingServerId] = useState<number | null>(null);
    const [migratingServerId, setMigratingServerId] = useState<number | null>(null);
    const [deletingServerId, setDeletingServerId] = useState<number | null>(null);
    const [isCreateServerDialogOpen, setIsCreateServerDialogOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardState, setWizardState] = useState<CreateServerWizardState>(createInitialWizardState);
    const [isCreatingServer, setIsCreatingServer] = useState(false);
    const [wizardError, setWizardError] = useState<{
        message: string;
        sqlDump: string | null;
        sqlFilename: string | null;
    } | null>(null);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const iconInputRef = useRef<HTMLInputElement | null>(null);

    const derivedWizardTablePrefix = useMemo(
        () => deriveWizardTablePrefix(wizardState.identifier),
        [wizardState.identifier],
    );
    const currentServer = servers.find((server) => server.id === currentServerId) || null;
    const isCreateServerDirty = hasCreateServerWizardChanges(wizardState);

    /**
     * Returns whether the editable row differs from the persisted server row.
     *
     * @param server - Persisted server row.
     * @returns `true` when the row contains unsaved changes.
     */
    const isServerDraftDirty = (server: ManagedServerRow): boolean => {
        return isServerDraftDifferent(server, serverDrafts[server.id]);
    };

    const hasDirtyServerDrafts = useMemo(
        () => servers.some((server) => isServerDraftDifferent(server, serverDrafts[server.id])),
        [serverDrafts, servers],
    );
    const hasUnsavedChanges = hasDirtyServerDrafts || (isCreateServerDialogOpen && isCreateServerDirty);
    const { confirmBeforeNavigation, allowNextNavigation } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
        message: UNSAVED_CHANGES_MESSAGE,
    });

    /**
     * Resets the create-server wizard to a fresh empty state.
     */
    const resetCreateServerWizard = () => {
        setWizardStep(0);
        setWizardState(createInitialWizardState());
        setWizardError(null);

        if (iconInputRef.current) {
            iconInputRef.current.value = '';
        }
    };

    /**
     * Closes the create-server dialog and discards the current wizard state.
     */
    const closeCreateServerDialog = () => {
        resetCreateServerWizard();
        setIsCreateServerDialogOpen(false);
    };

    const { requestClose: requestCreateServerDialogClose } = useDirtyModalGuard({
        hasUnsavedChanges: isCreateServerDirty,
        isCloseBlocked: isCreatingServer || isUploadingIcon,
        onClose: closeCreateServerDialog,
        message: UNSAVED_CHANGES_MESSAGE,
    });

    const loadServers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/servers');
            const payload = (await response.json()) as ManagedServersResponse & { error?: string };

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load servers.');
            }

            setServers([...payload.servers]);
            setCurrentServerId(payload.currentServerId);
            setServerDrafts(
                Object.fromEntries(payload.servers.map((server) => [server.id, createServerDraftFromRow(server)])),
            );
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load servers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadServers();
    }, []);

    /**
     * Updates one editable field in the server table draft.
     *
     * @param serverId - Registry row being edited.
     * @param fieldName - Mutable draft field.
     * @param value - Next field value.
     */
    const updateServerDraft = (serverId: number, fieldName: keyof ServerDraft, value: string) => {
        setServerDrafts((previous) => ({
            ...previous,
            [serverId]: {
                ...previous[serverId],
                [fieldName]: value,
            },
        }));
    };

    /**
     * Persists one edited server row.
     *
     * @param serverId - Registry row to update.
     */
    const handleSaveServer = async (serverId: number) => {
        const draft = serverDrafts[serverId];
        if (!draft) {
            return;
        }

        try {
            setSavingServerId(serverId);
            setError(null);

            const response = await fetch(`/api/admin/servers/${serverId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });
            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save the server.');
            }

            await loadServers();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save the server.');
        } finally {
            setSavingServerId(null);
        }
    };

    /**
     * Navigates to the selected server on its own domain dashboard.
     *
     * @param server - Target server row.
     */
    const handleSwitchServer = async (server: ManagedServerRow) => {
        if (!confirmBeforeNavigation()) {
            return;
        }

        try {
            setNavigatingServerId(server.id);
            setError(null);
            window.location.assign(createServerDashboardUrl(server));
        } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : 'Failed to switch to the server.');
        } finally {
            setNavigatingServerId(null);
        }
    };

    /**
     * Runs pending migrations for one registered server.
     *
     * @param serverId - Registry row to migrate.
     */
    const handleMigrateServer = async (serverId: number) => {
        try {
            setMigratingServerId(serverId);
            setError(null);

            const response = await fetch(`/api/admin/servers/${serverId}/migrate`, {
                method: 'POST',
            });
            const payload = (await response.json()) as {
                error?: string;
                appliedCount?: number;
                totalMigrationFiles?: number;
            };

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to run server migrations.');
            }

            await showAlert({
                title: 'Server migrated',
                message: `Applied ${payload.appliedCount ?? 0} of ${payload.totalMigrationFiles ?? 0} migration files.`,
            }).catch(() => undefined);
            await loadServers();
        } catch (migrationError) {
            setError(migrationError instanceof Error ? migrationError.message : 'Failed to run server migrations.');
        } finally {
            setMigratingServerId(null);
        }
    };

    /**
     * Deletes the current server after two explicit confirmations.
     */
    const handleDeleteCurrentServer = async () => {
        if (!currentServer) {
            return;
        }

        const confirmed = await showConfirm({
            title: 'Delete this server',
            message: 'Are you sure you want to delete this server? This action cannot be undone.',
            confirmLabel: 'Continue',
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        const typedName = await showPrompt({
            title: 'Type the server name',
            message: `Type \`${currentServer.name}\` to confirm deleting this server. Existing server data will stay untouched.`,
            confirmLabel: 'Delete this server',
            cancelLabel: 'Cancel',
            inputLabel: 'Server name confirmation',
            placeholder: currentServer.name,
        }).catch(() => '');

        if (typedName.trim() !== currentServer.name) {
            setError('Server deletion cancelled because the confirmation name did not match.');
            return;
        }

        try {
            setDeletingServerId(currentServer.id);
            setError(null);

            const response = await fetch(`/api/admin/servers/${currentServer.id}`, {
                method: 'DELETE',
            });
            const payload = (await response.json()) as { error?: string; redirectUrl?: string | null };

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to delete the current server.');
            }

            if (payload.redirectUrl) {
                allowNextNavigation();
                window.location.assign(payload.redirectUrl);
                return;
            }

            await loadServers();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete the current server.');
        } finally {
            setDeletingServerId(null);
        }
    };

    /**
     * Uploads a server icon and stores the resulting URL in the wizard.
     *
     * @param event - File input change event.
     */
    const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

            setWizardState((previous) => ({
                ...previous,
                iconUrl: blob.url,
            }));
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
    };

    /**
     * Persists the wizard as a new registered server.
     */
    const handleCreateServer = async () => {
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

            closeCreateServerDialog();
            await loadServers();
        } catch (createError) {
            setWizardError({
                message: createError instanceof Error ? createError.message : 'Failed to create the server.',
                sqlDump: null,
                sqlFilename: null,
            });
        } finally {
            setIsCreatingServer(false);
        }
    };

    /**
     * Updates one extra bootstrap user row in the wizard.
     *
     * @param index - User row index.
     * @param fieldName - Mutable user field.
     * @param value - Next field value.
     */
    const updateAdditionalUser = (index: number, fieldName: keyof WizardUser, value: string | boolean) => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: previous.additionalUsers.map((user, userIndex) =>
                userIndex === index ? { ...user, [fieldName]: value } : user,
            ),
        }));
    };

    /**
     * Adds a new extra bootstrap user row to the wizard.
     */
    const addAdditionalUser = () => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: [...previous.additionalUsers, createEmptyWizardUser()],
        }));
    };

    /**
     * Removes one extra bootstrap user row from the wizard.
     *
     * @param index - User row index to remove.
     */
    const removeAdditionalUser = (index: number) => {
        setWizardState((previous) => ({
            ...previous,
            additionalUsers: previous.additionalUsers.filter((_, userIndex) => userIndex !== index),
        }));
    };

    /**
     * Moves the wizard one step backward.
     */
    const handleWizardBack = () => {
        setWizardStep((previous) => Math.max(0, previous - 1));
    };

    /**
     * Moves the wizard one step forward after validating the current step.
     */
    const handleWizardNext = async () => {
        const validationMessage = getCreateServerWizardValidationMessage(wizardState, derivedWizardTablePrefix, wizardStep);
        if (validationMessage) {
            await showAlert({
                title: 'Create server',
                message: validationMessage,
            }).catch(() => undefined);
            return;
        }

        setWizardStep((previous) => Math.min(CREATE_SERVER_WIZARD_STEPS.length - 1, previous + 1));
    };

    /**
     * Navigates to one wizard step while preserving step-by-step validation.
     *
     * @param nextStep - Target step index.
     */
    const handleWizardStepSelection = async (nextStep: number) => {
        if (nextStep <= wizardStep) {
            setWizardStep(nextStep);
            return;
        }

        const validationMessage = getCreateServerWizardValidationMessage(wizardState, derivedWizardTablePrefix, wizardStep);
        if (validationMessage) {
            await showAlert({
                title: 'Create server',
                message: validationMessage,
            }).catch(() => undefined);
            return;
        }

        setWizardStep(nextStep);
    };

    return (
        <div className="container mx-auto space-y-8 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-light text-gray-900">Servers</h1>
                <button
                    type="button"
                    onClick={() => {
                        resetCreateServerWizard();
                        setIsCreateServerDialogOpen(true);
                    }}
                    className={PRIMARY_BUTTON_CLASS_NAME}
                >
                    <Plus className="h-4 w-4" />
                    Create new server
                </button>
            </div>

            {error ? (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{error}</p>
                </Card>
            ) : null}

            <Section title="Registered servers" gridClassName="grid gap-6">
                <Card className="hover:border-gray-200 hover:shadow-md">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Registered servers</h2>
                        </div>
                        {loading ? <span className="text-xs font-medium text-blue-600">Refreshing…</span> : null}
                    </div>

                    {loading && servers.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">Loading registered servers…</div>
                    ) : servers.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">No registered servers found yet.</div>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                                <colgroup>
                                    <col className="w-[16rem]" />
                                    <col className="w-[10rem]" />
                                    <col className="w-[18rem]" />
                                    <col className="w-[13rem]" />
                                    <col className="w-[10rem]" />
                                    <col className="w-[11rem]" />
                                    <col className="w-[11rem]" />
                                    <col className="w-[12rem]" />
                                </colgroup>
                                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">Environment</th>
                                        <th className="px-4 py-3 text-left font-semibold">Domain</th>
                                        <th className="px-4 py-3 text-left font-semibold">Table prefix</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold">Created</th>
                                        <th className="px-4 py-3 text-left font-semibold">Updated</th>
                                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {servers.map((server) => {
                                        const draft = serverDrafts[server.id];
                                        const isCurrent = server.id === currentServerId;
                                        const isDirty = isServerDraftDirty(server);
                                        const isSaving = savingServerId === server.id;
                                        const isNavigating = navigatingServerId === server.id;
                                        const isMigrating = migratingServerId === server.id;

                                        return (
                                            <tr key={server.id} className={isCurrent ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="text"
                                                        value={draft?.name || ''}
                                                        onChange={(event) =>
                                                            updateServerDraft(server.id, 'name', event.target.value)
                                                        }
                                                        className={INPUT_CLASS_NAME}
                                                        aria-label={`Server name for ${server.name}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <select
                                                        value={draft?.environment || server.environment}
                                                        onChange={(event) =>
                                                            updateServerDraft(
                                                                server.id,
                                                                'environment',
                                                                event.target.value as ManagedServerRow['environment'],
                                                            )
                                                        }
                                                        className={INPUT_CLASS_NAME}
                                                        aria-label={`Environment for ${server.name}`}
                                                    >
                                                        <option value="PREVIEW">PREVIEW</option>
                                                        <option value="PRODUCTION">PRODUCTION</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="text"
                                                        value={draft?.domain || ''}
                                                        onChange={(event) =>
                                                            updateServerDraft(server.id, 'domain', event.target.value)
                                                        }
                                                        className={INPUT_CLASS_NAME}
                                                        aria-label={`Domain for ${server.name}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="text"
                                                        value={draft?.tablePrefix || ''}
                                                        onChange={(event) =>
                                                            updateServerDraft(server.id, 'tablePrefix', event.target.value)
                                                        }
                                                        className={`${INPUT_CLASS_NAME} font-mono`}
                                                        aria-label={`Table prefix for ${server.name}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex flex-wrap gap-2">
                                                        {isCurrent ? <ServerStatusBadge label="Current" tone="green" /> : null}
                                                        {isDirty ? <ServerStatusBadge label="Unsaved" tone="blue" /> : null}
                                                        {!isCurrent && !isDirty ? (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-xs text-gray-600">
                                                    <span className="whitespace-nowrap font-mono">
                                                        {formatDateTime(server.createdAt)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-top text-xs text-gray-600">
                                                    <span className="whitespace-nowrap font-mono">
                                                        {formatDateTime(server.updatedAt)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleSaveServer(server.id)}
                                                            disabled={!isDirty || isSaving}
                                                            className={`${PRIMARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Save className="h-3.5 w-3.5" />
                                                            )}
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleMigrateServer(server.id)}
                                                            disabled={isMigrating}
                                                            className={`${SECONDARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                                                        >
                                                            {isMigrating ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <RefreshCcw className="h-3.5 w-3.5" />
                                                            )}
                                                            Migrate
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleSwitchServer(server)}
                                                            disabled={isNavigating}
                                                            className={`${SECONDARY_BUTTON_CLASS_NAME} px-2 py-1 text-xs`}
                                                        >
                                                            {isNavigating ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                                            )}
                                                            Switch
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </Section>

            {isCreateServerDialogOpen ? (
                <Dialog onClose={requestCreateServerDialogClose} className="mx-4 w-full max-w-5xl overflow-hidden">
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
                                onClick={requestCreateServerDialogClose}
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
                                                downloadTextFile(wizardError.sqlFilename || 'create-server.sql', wizardError.sqlDump || '')
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

                        {wizardStep === 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="create-server-name" className="mb-1 block text-sm font-medium text-gray-700">
                                        Server name
                                    </label>
                                    <input
                                        id="create-server-name"
                                        type="text"
                                        value={wizardState.name}
                                        onChange={(event) =>
                                            setWizardState((previous) => ({
                                                ...previous,
                                                name: event.target.value,
                                            }))
                                        }
                                        className={INPUT_CLASS_NAME}
                                        placeholder="Acme Support"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="create-server-identifier"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Identifier / slug
                                    </label>
                                    <input
                                        id="create-server-identifier"
                                        type="text"
                                        value={wizardState.identifier}
                                        onChange={(event) =>
                                            setWizardState((previous) => ({
                                                ...previous,
                                                identifier: event.target.value.toLowerCase(),
                                            }))
                                        }
                                        className={`${INPUT_CLASS_NAME} font-mono`}
                                        placeholder="acme-support"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Use lowercase letters, numbers, and hyphens only.
                                    </p>
                                </div>
                                <div>
                                    <label
                                        htmlFor="create-server-table-prefix"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
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
                                    <label
                                        htmlFor="create-server-environment"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Environment
                                    </label>
                                    <select
                                        id="create-server-environment"
                                        value={wizardState.environment}
                                        onChange={(event) =>
                                            setWizardState((previous) => ({
                                                ...previous,
                                                environment: event.target.value as ManagedServerRow['environment'],
                                            }))
                                        }
                                        className={INPUT_CLASS_NAME}
                                    >
                                        <option value="PREVIEW">PREVIEW</option>
                                        <option value="PRODUCTION">PRODUCTION</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="create-server-domain"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Domain
                                    </label>
                                    <input
                                        id="create-server-domain"
                                        type="text"
                                        value={wizardState.domain}
                                        onChange={(event) =>
                                            setWizardState((previous) => ({
                                                ...previous,
                                                domain: event.target.value,
                                            }))
                                        }
                                        className={INPUT_CLASS_NAME}
                                        placeholder="acme-support.ptbk.io"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="create-server-icon-url"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Server icon
                                    </label>
                                    <div className="flex flex-col gap-3 lg:flex-row">
                                        <input
                                            id="create-server-icon-url"
                                            type="text"
                                            value={wizardState.iconUrl}
                                            onChange={(event) =>
                                                setWizardState((previous) => ({
                                                    ...previous,
                                                    iconUrl: event.target.value,
                                                }))
                                            }
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
                        ) : null}

                        {wizardStep === 1 ? (
                            <div className="space-y-6">
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="mb-4">
                                        <h3 className="text-base font-semibold text-gray-900">Required admin user</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            This admin belongs to the new server itself, not necessarily to the creating
                                            user.
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
                                                onChange={(event) =>
                                                    setWizardState((previous) => ({
                                                        ...previous,
                                                        adminUser: {
                                                            ...previous.adminUser,
                                                            username: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className={INPUT_CLASS_NAME}
                                                placeholder="admin"
                                            />
                                        </div>
                                        <SecretInput
                                            label="Admin password"
                                            value={wizardState.adminUser.password}
                                            onChange={(event) =>
                                                setWizardState((previous) => ({
                                                    ...previous,
                                                    adminUser: {
                                                        ...previous.adminUser,
                                                        password: event.target.value,
                                                    },
                                                }))
                                            }
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
                        ) : null}

                        {wizardStep === 2 ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="create-server-language"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Initial language
                                        </label>
                                        <select
                                            id="create-server-language"
                                            value={wizardState.initialSettings.language}
                                            onChange={(event) =>
                                                setWizardState((previous) => ({
                                                    ...previous,
                                                    initialSettings: {
                                                        ...previous.initialSettings,
                                                        language: event.target.value,
                                                    },
                                                }))
                                            }
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
                                            onChange={(event) =>
                                                setWizardState((previous) => ({
                                                    ...previous,
                                                    initialSettings: {
                                                        ...previous.initialSettings,
                                                        homepageMessage: event.target.value,
                                                    },
                                                }))
                                            }
                                            className={TEXTAREA_CLASS_NAME}
                                            placeholder="Optional markdown shown on the new server homepage."
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {CREATE_SERVER_FEATURE_FLAGS.map((flag) => (
                                        <label
                                            key={flag.key}
                                            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={wizardState.initialSettings[flag.key]}
                                                onChange={(event) =>
                                                    setWizardState((previous) => ({
                                                        ...previous,
                                                        initialSettings: {
                                                            ...previous.initialSettings,
                                                            [flag.key]: event.target.checked,
                                                        },
                                                    }))
                                                }
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
                        ) : null}

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-gray-500">
                                If setup fails, you can download the SQL dump for manual recovery.
                            </p>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetCreateServerWizard}
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
                                        {isCreatingServer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Create server
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </Dialog>
            ) : null}

            {currentServer ? (
                <Section title="Delete current server" gridClassName="grid gap-6">
                    <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-medium text-red-900">Delete current server</h2>
                                <p className="mt-1 text-sm text-red-800">
                                    This removes the server registration for <strong>{currentServer.name}</strong>. Existing
                                    server data stays untouched. You must type the server name to confirm.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteCurrentServer()}
                                    disabled={deletingServerId === currentServer.id}
                                    className={DANGER_BUTTON_CLASS_NAME}
                                >
                                    {deletingServerId === currentServer.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    Delete current server
                                </button>
                            </div>
                        </div>
                    </Card>
                </Section>
            ) : null}
        </div>
    );
}
