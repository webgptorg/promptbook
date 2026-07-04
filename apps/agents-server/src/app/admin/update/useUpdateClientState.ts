'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomCommitPickerCandidate } from './CustomCommitPicker';
import { getUpdateJobSuccessMessage } from './getUpdateJobSuccessMessage';
import type { UpdateEnvironmentOption, UpdateOverview } from './UpdateOverview';

/**
 * Interval (ms) used while polling a running standalone VPS update job.
 */
const UPDATE_OVERVIEW_REFRESH_INTERVAL_MS = 4000;

/**
 * Options for loading the standalone VPS update overview.
 *
 * @private type of `useUpdateClientState`
 */
type LoadUpdateOverviewOptions = {
    readonly isSilent?: boolean;
    readonly isRestartExpected?: boolean;
};

/**
 * Body sent when starting a standalone VPS self-update.
 *
 * @private type of `useUpdateClientState`
 */
type StartUpdateRequestBody = {
    readonly environment: string;
    readonly customRef: string | null;
    readonly originRepositoryUrl: string | null;
};

/**
 * Options used to build the start-update request body.
 *
 * @private type of `useUpdateClientState`
 */
type CreateStartUpdateRequestBodyOptions = {
    readonly selectedEnvironment: UpdateEnvironmentOption;
    readonly isCustomEnvironmentSelected: boolean;
    readonly customRef: string;
    readonly isOriginRepositoryUrlOverrideChanged: boolean;
    readonly originRepositoryUrlOverride: string;
};

/**
 * Options used to build the user-facing start-update success message.
 *
 * @private type of `useUpdateClientState`
 */
type CreateStartUpdateSuccessMessageOptions = {
    readonly selectedEnvironment: UpdateEnvironmentOption;
    readonly isCustomEnvironmentSelected: boolean;
    readonly isEnvironmentSwitchRequired: boolean;
    readonly customRef: string;
};

/**
 * State and actions used by the standalone VPS update client page.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateClientState = {
    readonly overview: UpdateOverview | null;
    readonly selectedEnvironment: UpdateEnvironmentOption | null;
    readonly customRef: string;
    readonly originRepositoryUrlOverride: string;
    readonly isAdvancedExpanded: boolean;
    readonly isLoading: boolean;
    readonly isStartingUpdate: boolean;
    readonly errorMessage: string | null;
    readonly successMessage: string | null;
    readonly isCustomEnvironmentSelected: boolean;
    readonly isEnvironmentSwitchRequired: boolean;
    readonly isUpdateRunning: boolean;
    readonly isCustomRefRelease: boolean;
    readonly isCustomRefMissing: boolean;
    readonly isOriginRepositoryUrlOverrideChanged: boolean;
    readonly updateTerminalId: string;
    readonly updateTerminalEmptyState: string;
    readonly loadOverview: (options?: LoadUpdateOverviewOptions) => Promise<void>;
    readonly startUpdate: () => Promise<void>;
    readonly selectEnvironment: (environmentId: string) => void;
    readonly selectCustomRef: (
        nextRef: string,
        matchedCandidate: CustomCommitPickerCandidate | null,
    ) => void;
    readonly changeOriginRepositoryUrlOverride: (nextValue: string) => void;
    readonly toggleAdvanced: () => void;
};

/**
 * Collects standalone VPS update page state, polling, and mutation actions behind one focused hook.
 *
 * @returns State and actions needed to render `<UpdateClient/>`.
 *
 * @private hook of `<UpdateClient/>`
 */
export function useUpdateClientState(): UpdateClientState {
    const [overview, setOverview] = useState<UpdateOverview | null>(null);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [customRef, setCustomRef] = useState<string>('');
    const [customCandidate, setCustomCandidate] = useState<CustomCommitPickerCandidate | null>(null);
    const [originRepositoryUrlOverride, setOriginRepositoryUrlOverride] = useState<string>('');
    const [isAdvancedExpanded, setIsAdvancedExpanded] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingUpdate, setIsStartingUpdate] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadOverview = useCallback(async (options?: LoadUpdateOverviewOptions): Promise<void> => {
        try {
            if (!options?.isSilent) {
                setIsLoading(true);
            }
            setErrorMessage(null);

            const payload = await fetchUpdateOverview();

            setOverview(payload);
            setSelectedEnvironmentId(
                (currentSelectedEnvironmentId) => currentSelectedEnvironmentId || payload.currentEnvironment.id,
            );
            setOriginRepositoryUrlOverride((currentValue) => currentValue || payload.originRepositoryUrl);
            if (payload.job.status === 'succeeded') {
                setSuccessMessage(getUpdateJobSuccessMessage(payload.job));
            } else if (payload.job.status === 'failed') {
                setSuccessMessage(null);
            }
        } catch (error) {
            if (options?.isRestartExpected) {
                return;
            }

            setErrorMessage(getErrorMessage(error, 'Failed to load the update overview.'));
        } finally {
            if (!options?.isSilent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (overview?.job.status !== 'running') {
            return;
        }

        const interval = window.setInterval(() => {
            void loadOverview({ isSilent: true, isRestartExpected: true });
        }, UPDATE_OVERVIEW_REFRESH_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
        };
    }, [loadOverview, overview?.job.status]);

    const selectedEnvironment = useMemo(
        () => getSelectedEnvironment(overview, selectedEnvironmentId),
        [overview, selectedEnvironmentId],
    );
    const isCustomEnvironmentSelected = selectedEnvironment?.isCustom === true;
    const isEnvironmentSwitchRequired = isUpdateEnvironmentSwitchRequired(selectedEnvironment, overview);
    const isUpdateRunning = overview?.job.status === 'running';
    const isCustomRefRelease = isCustomEnvironmentSelected ? customCandidate?.isReleaseTag === true : true;
    const isCustomRefMissing = isCustomEnvironmentSelected && !customRef.trim();
    const isOriginRepositoryUrlOverrideChanged = isOriginRepositoryUrlOverrideChangedForOverview(
        overview,
        originRepositoryUrlOverride,
    );
    const updateTerminalId = buildUpdateTerminalId(overview);
    const updateTerminalEmptyState = getUpdateTerminalEmptyState(isLoading, overview);

    const startUpdate = useCallback(async (): Promise<void> => {
        if (!selectedEnvironment) {
            return;
        }

        try {
            setIsStartingUpdate(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            const payload = await startUpdateJob(
                createStartUpdateRequestBody({
                    selectedEnvironment,
                    isCustomEnvironmentSelected,
                    customRef,
                    isOriginRepositoryUrlOverrideChanged,
                    originRepositoryUrlOverride,
                }),
            );

            setOverview(payload);
            setSuccessMessage(
                createStartUpdateSuccessMessage({
                    selectedEnvironment,
                    isCustomEnvironmentSelected,
                    isEnvironmentSwitchRequired,
                    customRef,
                }),
            );
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Failed to start the update.'));
        } finally {
            setIsStartingUpdate(false);
        }
    }, [
        customRef,
        isCustomEnvironmentSelected,
        isEnvironmentSwitchRequired,
        isOriginRepositoryUrlOverrideChanged,
        originRepositoryUrlOverride,
        selectedEnvironment,
    ]);

    const selectEnvironment = useCallback((environmentId: string): void => {
        setSelectedEnvironmentId(environmentId);
    }, []);

    const selectCustomRef = useCallback(
        (nextRef: string, matchedCandidate: CustomCommitPickerCandidate | null): void => {
            setCustomRef(nextRef);
            setCustomCandidate(matchedCandidate);
        },
        [],
    );

    const toggleAdvanced = useCallback((): void => {
        setIsAdvancedExpanded((current) => !current);
    }, []);

    return {
        overview,
        selectedEnvironment,
        customRef,
        originRepositoryUrlOverride,
        isAdvancedExpanded,
        isLoading,
        isStartingUpdate,
        errorMessage,
        successMessage,
        isCustomEnvironmentSelected,
        isEnvironmentSwitchRequired,
        isUpdateRunning,
        isCustomRefRelease,
        isCustomRefMissing,
        isOriginRepositoryUrlOverrideChanged,
        updateTerminalId,
        updateTerminalEmptyState,
        loadOverview,
        startUpdate,
        selectEnvironment,
        selectCustomRef,
        changeOriginRepositoryUrlOverride: setOriginRepositoryUrlOverride,
        toggleAdvanced,
    };
}

/**
 * Loads the latest standalone VPS update overview from the admin API.
 *
 * @returns Parsed update overview.
 *
 * @private function of `useUpdateClientState`
 */
async function fetchUpdateOverview(): Promise<UpdateOverview> {
    const response = await fetch('/api/admin/update', { cache: 'no-store' });
    const payload = (await response.json()) as UpdateOverview;

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load the update overview.');
    }

    return payload;
}

/**
 * Starts a standalone VPS update job with the prepared API request body.
 *
 * @param requestBody - Target environment/ref/origin payload.
 * @returns Updated overview snapshot returned by the server.
 *
 * @private function of `useUpdateClientState`
 */
async function startUpdateJob(requestBody: StartUpdateRequestBody): Promise<UpdateOverview> {
    const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });
    const payload = (await response.json()) as UpdateOverview;

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to start the update.');
    }

    return payload;
}

/**
 * Builds the POST body for starting the update without mixing UI state decisions into the network call.
 *
 * @param options - Current target environment, custom ref, and origin override state.
 * @returns Request body accepted by `/api/admin/update`.
 *
 * @private function of `useUpdateClientState`
 */
function createStartUpdateRequestBody(options: CreateStartUpdateRequestBodyOptions): StartUpdateRequestBody {
    const {
        customRef,
        isCustomEnvironmentSelected,
        isOriginRepositoryUrlOverrideChanged,
        originRepositoryUrlOverride,
        selectedEnvironment,
    } = options;

    return {
        environment: selectedEnvironment.id,
        customRef: isCustomEnvironmentSelected ? customRef.trim() : null,
        originRepositoryUrl: isOriginRepositoryUrlOverrideChanged ? originRepositoryUrlOverride.trim() : null,
    };
}

/**
 * Resolves the success message shown after the update job is accepted by the server.
 *
 * @param options - Target selection state used to describe the accepted job.
 * @returns Human-readable success message.
 *
 * @private function of `useUpdateClientState`
 */
function createStartUpdateSuccessMessage(options: CreateStartUpdateSuccessMessageOptions): string {
    const { customRef, isCustomEnvironmentSelected, isEnvironmentSwitchRequired, selectedEnvironment } = options;

    if (isCustomEnvironmentSelected) {
        return `Started the standalone VPS update to custom ref ${customRef.trim()}.`;
    }

    if (isEnvironmentSwitchRequired) {
        return `Switched to ${selectedEnvironment.label} and started the standalone VPS update.`;
    }

    return 'Standalone VPS update started.';
}

/**
 * Selects the target environment from the current overview and selected id.
 *
 * @param overview - Current overview snapshot.
 * @param selectedEnvironmentId - Environment id selected in the UI.
 * @returns Selected environment, current environment fallback, or `null` while loading.
 *
 * @private function of `useUpdateClientState`
 */
function getSelectedEnvironment(
    overview: UpdateOverview | null,
    selectedEnvironmentId: string,
): UpdateEnvironmentOption | null {
    return (
        overview?.environments.find((environment) => environment.id === selectedEnvironmentId) ||
        overview?.currentEnvironment ||
        null
    );
}

/**
 * Resolves whether the selected target differs from the currently tracked environment.
 *
 * @param selectedEnvironment - Environment selected in the UI.
 * @param overview - Current overview snapshot.
 * @returns `true` when updating also switches branches/environments.
 *
 * @private function of `useUpdateClientState`
 */
function isUpdateEnvironmentSwitchRequired(
    selectedEnvironment: UpdateEnvironmentOption | null,
    overview: UpdateOverview | null,
): boolean {
    return Boolean(selectedEnvironment) && selectedEnvironment?.id !== overview?.currentEnvironment.id;
}

/**
 * Resolves whether the upstream repository input differs from the persisted origin URL.
 *
 * @param overview - Current overview snapshot.
 * @param originRepositoryUrlOverride - Current upstream repository input value.
 * @returns `true` when the input should be sent with the update request.
 *
 * @private function of `useUpdateClientState`
 */
function isOriginRepositoryUrlOverrideChangedForOverview(
    overview: UpdateOverview | null,
    originRepositoryUrlOverride: string,
): boolean {
    return overview !== null && originRepositoryUrlOverride.trim() !== overview.originRepositoryUrl;
}

/**
 * Builds a stable terminal id for the latest visible update job.
 *
 * @param overview - Current overview snapshot.
 * @returns Terminal id used by `<AdminXtermTerminal/>`.
 *
 * @private function of `useUpdateClientState`
 */
function buildUpdateTerminalId(overview: UpdateOverview | null): string {
    return `standalone-vps-update:${overview?.job.startedAt || overview?.job.finishedAt || overview?.job.status || 'loading'}`;
}

/**
 * Builds the log empty-state text from the current loading state.
 *
 * @param isLoading - Whether the initial overview load is still in progress.
 * @param overview - Current overview snapshot.
 * @returns Empty-state message for the update terminal.
 *
 * @private function of `useUpdateClientState`
 */
function getUpdateTerminalEmptyState(isLoading: boolean, overview: UpdateOverview | null): string {
    return isLoading && !overview ? 'Loading update log...' : 'No persisted update log output yet.';
}

/**
 * Extracts a message from unknown caught values while preserving the existing fallback behavior.
 *
 * @param error - Unknown caught value.
 * @param fallbackMessage - Message used when the caught value is not an `Error`.
 * @returns Human-readable error message.
 *
 * @private function of `useUpdateClientState`
 */
function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}
