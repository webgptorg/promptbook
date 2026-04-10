'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ANALYTICS_METADATA_KEYS,
    type AnalyticsMetadataKey,
    type AnalyticsSettings,
    DEFAULT_ANALYTICS_SETTINGS,
    getAnalyticsMetadataDefinition,
    mapAnalyticsSettingsToMetadataPayload,
    mapMetadataToAnalyticsSettings,
} from '../../../constants/analyticsMetadata';

/**
 * Status banner shown after analytics operations.
 *
 * @private function of CustomJsClient
 */
type AnalyticsStatusMessage = {
    type: 'success' | 'error';
    text: string;
};

/**
 * Notes stored alongside analytics metadata values.
 *
 * @private function of CustomJsClient
 */
type AnalyticsNoteMap = Partial<Record<AnalyticsMetadataKey, string | null>>;

/**
 * Metadata row returned by `GET /api/metadata`.
 *
 * @private function of CustomJsClient
 */
type AnalyticsMetadataResponse = {
    key: string;
    value: string | null;
    note: string | null;
};

/**
 * Normalized analytics state returned after loading metadata.
 *
 * @private function of CustomJsClient
 */
type LoadedAnalyticsState = {
    settings: AnalyticsSettings;
    persistedAnalyticsKeys: Set<AnalyticsMetadataKey>;
    analyticsNotes: AnalyticsNoteMap;
};

/**
 * Props consumed by `saveAnalyticsMetadataEntry`.
 *
 * @private function of CustomJsClient
 */
type SaveAnalyticsMetadataEntryProps = {
    key: AnalyticsMetadataKey;
    value: string;
    note: string;
    isPersisted: boolean;
};

/**
 * Result returned by `useCustomJsAnalyticsState`.
 *
 * @private function of CustomJsClient
 */
type UseCustomJsAnalyticsStateResult = {
    analyticsHasChanges: boolean;
    analyticsLoadError: string | null;
    analyticsSettings: AnalyticsSettings;
    analyticsStatus: AnalyticsStatusMessage | null;
    isAnalyticsLoading: boolean;
    isAnalyticsSaving: boolean;
    loadAnalyticsSettings: () => Promise<void>;
    saveAnalyticsSettings: () => Promise<void>;
    updateAnalyticsSettings: (updates: Partial<AnalyticsSettings>) => void;
};

/**
 * Determines whether two analytics settings snapshots are identical.
 *
 * @private function of CustomJsClient
 */
function areAnalyticsSettingsEqual(first: AnalyticsSettings, second: AnalyticsSettings): boolean {
    return (
        first.googleMeasurementId === second.googleMeasurementId &&
        first.googleAutoPageView === second.googleAutoPageView &&
        first.googleAnonymizeIp === second.googleAnonymizeIp &&
        first.googleAdPersonalization === second.googleAdPersonalization &&
        first.smartsappWorkspaceId === second.smartsappWorkspaceId &&
        first.smartsappAutoPageView === second.smartsappAutoPageView &&
        first.smartsappCaptureErrors === second.smartsappCaptureErrors
    );
}

/**
 * Normalizes the error message shown in the analytics banners.
 *
 * @private function of CustomJsClient
 */
function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Resolves analytics settings, notes, and persistence flags from metadata rows.
 *
 * @private function of CustomJsClient
 */
function resolveLoadedAnalyticsState(data: ReadonlyArray<AnalyticsMetadataResponse>): LoadedAnalyticsState {
    const metadataMap: Record<string, string | null> = {};
    const analyticsNotes: AnalyticsNoteMap = {};
    const persistedAnalyticsKeys = new Set<AnalyticsMetadataKey>();

    data.forEach((entry) => {
        metadataMap[entry.key] = entry.value;

        if (ANALYTICS_METADATA_KEYS.includes(entry.key as AnalyticsMetadataKey)) {
            const analyticsMetadataKey = entry.key as AnalyticsMetadataKey;
            persistedAnalyticsKeys.add(analyticsMetadataKey);
            analyticsNotes[analyticsMetadataKey] = entry.note ?? null;
        }
    });

    return {
        settings: mapMetadataToAnalyticsSettings(metadataMap),
        persistedAnalyticsKeys,
        analyticsNotes,
    };
}

/**
 * Builds the note map stored after a successful analytics save.
 *
 * @private function of CustomJsClient
 */
function createSavedAnalyticsNotes(analyticsNotes: AnalyticsNoteMap): AnalyticsNoteMap {
    const nextAnalyticsNotes: AnalyticsNoteMap = {};

    for (const key of ANALYTICS_METADATA_KEYS) {
        nextAnalyticsNotes[key] = analyticsNotes[key] ?? getAnalyticsMetadataDefinition(key).note;
    }

    return nextAnalyticsNotes;
}

/**
 * Loads analytics settings from the metadata API.
 *
 * @private function of CustomJsClient
 */
async function fetchAnalyticsSettingsState(): Promise<LoadedAnalyticsState> {
    const response = await fetch('/api/metadata');
    if (!response.ok) {
        throw new Error('Failed to load analytics settings.');
    }

    const data = (await response.json()) as AnalyticsMetadataResponse[];
    return resolveLoadedAnalyticsState(data);
}

/**
 * Persists a single analytics metadata row.
 *
 * @private function of CustomJsClient
 */
async function saveAnalyticsMetadataEntry({
    key,
    value,
    note,
    isPersisted,
}: SaveAnalyticsMetadataEntryProps): Promise<void> {
    const response = await fetch('/api/metadata', {
        method: isPersisted ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key,
            value,
            note,
        }),
    });

    if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || 'Failed to save analytics settings.');
    }
}

/**
 * Saves the current analytics settings through the metadata API.
 *
 * @private function of CustomJsClient
 */
async function persistAnalyticsSettings(
    analyticsSettings: AnalyticsSettings,
    analyticsNotes: AnalyticsNoteMap,
    persistedAnalyticsKeys: ReadonlySet<AnalyticsMetadataKey>,
): Promise<AnalyticsNoteMap> {
    const metadataPayload = mapAnalyticsSettingsToMetadataPayload(analyticsSettings);

    for (const key of ANALYTICS_METADATA_KEYS) {
        const note = analyticsNotes[key] ?? getAnalyticsMetadataDefinition(key).note;

        await saveAnalyticsMetadataEntry({
            key,
            value: metadataPayload[key],
            note,
            isPersisted: persistedAnalyticsKeys.has(key),
        });
    }

    return createSavedAnalyticsNotes(analyticsNotes);
}

/**
 * Manages analytics metadata state for the custom JavaScript admin page.
 *
 * @private function of CustomJsClient
 */
export function useCustomJsAnalyticsState(): UseCustomJsAnalyticsStateResult {
    const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings>(DEFAULT_ANALYTICS_SETTINGS);
    const [analyticsSnapshot, setAnalyticsSnapshot] = useState<AnalyticsSettings>(DEFAULT_ANALYTICS_SETTINGS);
    const [persistedAnalyticsKeys, setPersistedAnalyticsKeys] = useState<Set<AnalyticsMetadataKey>>(() => new Set());
    const [analyticsNotes, setAnalyticsNotes] = useState<AnalyticsNoteMap>({});
    const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatusMessage | null>(null);
    const [analyticsLoadError, setAnalyticsLoadError] = useState<string | null>(null);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
    const [isAnalyticsSaving, setIsAnalyticsSaving] = useState(false);

    const analyticsHasChanges = useMemo(
        () => !areAnalyticsSettingsEqual(analyticsSettings, analyticsSnapshot),
        [analyticsSettings, analyticsSnapshot],
    );

    const loadAnalyticsSettings = useCallback(async () => {
        setIsAnalyticsLoading(true);
        setAnalyticsLoadError(null);

        try {
            const loadedAnalyticsState = await fetchAnalyticsSettingsState();
            setAnalyticsSettings(loadedAnalyticsState.settings);
            setAnalyticsSnapshot(loadedAnalyticsState.settings);
            setPersistedAnalyticsKeys(loadedAnalyticsState.persistedAnalyticsKeys);
            setAnalyticsNotes(loadedAnalyticsState.analyticsNotes);
            setAnalyticsStatus(null);
        } catch (loadError) {
            setAnalyticsLoadError(getErrorMessage(loadError, 'Failed to load analytics settings.'));
        } finally {
            setIsAnalyticsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAnalyticsSettings();
    }, [loadAnalyticsSettings]);

    const updateAnalyticsSettings = useCallback((updates: Partial<AnalyticsSettings>) => {
        setAnalyticsStatus(null);
        setAnalyticsSettings((previousAnalyticsSettings) => ({
            ...previousAnalyticsSettings,
            ...updates,
        }));
    }, []);

    const saveAnalyticsSettings = useCallback(async () => {
        setIsAnalyticsSaving(true);
        setAnalyticsStatus(null);

        try {
            const nextAnalyticsNotes = await persistAnalyticsSettings(
                analyticsSettings,
                analyticsNotes,
                persistedAnalyticsKeys,
            );

            setAnalyticsSnapshot(analyticsSettings);
            setPersistedAnalyticsKeys(new Set(ANALYTICS_METADATA_KEYS));
            setAnalyticsNotes(nextAnalyticsNotes);
            setAnalyticsStatus({
                type: 'success',
                text: 'Analytics settings saved. Reload any open pages to apply the new integrations.',
            });
        } catch (saveError) {
            setAnalyticsStatus({
                type: 'error',
                text: getErrorMessage(saveError, 'Failed to save analytics settings.'),
            });
        } finally {
            setIsAnalyticsSaving(false);
        }
    }, [analyticsNotes, analyticsSettings, persistedAnalyticsKeys]);

    return {
        analyticsHasChanges,
        analyticsLoadError,
        analyticsSettings,
        analyticsStatus,
        isAnalyticsLoading,
        isAnalyticsSaving,
        loadAnalyticsSettings,
        saveAnalyticsSettings,
        updateAnalyticsSettings,
    };
}
