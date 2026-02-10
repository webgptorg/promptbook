/**
 * Runtime state that represents the current sound and vibration preferences.
 */
export type SoundPreferences = {
    /** Whether chat sounds are enabled. */
    readonly isSoundsEnabled: boolean;
    /** Whether vibration feedback is enabled. */
    readonly isVibrationEnabled: boolean;
};

const SOUND_STORAGE_KEY = 'promptbook_chat_sounds_enabled';
const VIBRATION_STORAGE_KEY = 'promptbook_chat_vibration_enabled';
const DEFAULT_PREFERENCES: SoundPreferences = {
    isSoundsEnabled: false,
    isVibrationEnabled: true,
};

let currentPreferences: SoundPreferences = DEFAULT_PREFERENCES;
let isInitialized = false;
const listeners = new Set<(prefs: SoundPreferences) => void>();

function readBooleanFromLocalStorage(key: string, fallback: boolean): boolean {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const stored = window.localStorage.getItem(key);
    if (stored === 'true') {
        return true;
    }

    if (stored === 'false') {
        return false;
    }

    return fallback;
}

function writeBooleanToLocalStorage(key: string, value: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(key, value ? 'true' : 'false');
    } catch (error) {
        console.warn(`Unable to persist ${key} preference:`, error);
    }
}

function notifyListeners(): void {
    for (const listener of listeners) {
        listener(currentPreferences);
    }
}

/**
 * Initializes the preferences from metadata defaults and localStorage.
 *
 * @param defaults - Optional metadata defaults to seed preferences.
 */
export function initializeSoundPreferences(defaults: Partial<SoundPreferences> = {}): void {
    currentPreferences = {
        isSoundsEnabled: readBooleanFromLocalStorage(
            SOUND_STORAGE_KEY,
            defaults.isSoundsEnabled ?? DEFAULT_PREFERENCES.isSoundsEnabled,
        ),
        isVibrationEnabled: readBooleanFromLocalStorage(
            VIBRATION_STORAGE_KEY,
            defaults.isVibrationEnabled ?? DEFAULT_PREFERENCES.isVibrationEnabled,
        ),
    };

    isInitialized = true;
    notifyListeners();
}

/**
 * Returns the last known preferences, initializing them if needed.
 */
export function getSoundPreferences(): SoundPreferences {
    if (!isInitialized) {
        initializeSoundPreferences();
    }
    return currentPreferences;
}

/**
 * Subscribes to preference updates.
 *
 * @param listener - Called whenever preferences change.
 * @returns Unsubscribe callback.
 */
export function subscribeToSoundPreferences(listener: (prefs: SoundPreferences) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function ensureInitialized(defaults: Partial<SoundPreferences> = {}): void {
    if (!isInitialized) {
        initializeSoundPreferences(defaults);
    }
}

/**
 * Persists the sounds-enabled preference and notifies listeners.
 *
 * @param enabled - New state for chat sounds.
 */
export function setSoundsEnabled(enabled: boolean): void {
    ensureInitialized();
    if (currentPreferences.isSoundsEnabled === enabled) {
        writeBooleanToLocalStorage(SOUND_STORAGE_KEY, enabled);
        return;
    }

    currentPreferences = { ...currentPreferences, isSoundsEnabled: enabled };
    writeBooleanToLocalStorage(SOUND_STORAGE_KEY, enabled);
    notifyListeners();
}

/**
 * Persists the vibration-enabled preference and notifies listeners.
 *
 * @param enabled - New state for vibration feedback.
 */
export function setVibrationEnabled(enabled: boolean): void {
    ensureInitialized();
    if (currentPreferences.isVibrationEnabled === enabled) {
        writeBooleanToLocalStorage(VIBRATION_STORAGE_KEY, enabled);
        return;
    }

    currentPreferences = { ...currentPreferences, isVibrationEnabled: enabled };
    writeBooleanToLocalStorage(VIBRATION_STORAGE_KEY, enabled);
    notifyListeners();
}
