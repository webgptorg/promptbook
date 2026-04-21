import {
    AGENTS_SERVER_THEME_PREFERENCES,
    DEFAULT_AGENTS_SERVER_THEME_PREFERENCE,
    isAgentsServerThemePreference,
    type AgentsServerThemePreference,
} from '../constants/themePreferences';
import { deleteUserDataByKeysForUser, getUserDataValue, upsertUserDataValue } from './userData';

/**
 * Stored theme payload persisted in `UserData`.
 */
export type ThemeSettingsRecord = {
    version: 1;
    preference: AgentsServerThemePreference;
};

/**
 * Response payload returned by the theme settings API.
 */
export type ThemeSettingsSnapshot = {
    preference: AgentsServerThemePreference;
};

/**
 * Version marker stored with persisted theme settings payloads.
 */
const THEME_SETTINGS_VERSION = 1 as const;

/**
 * `UserData.key` used for Agents Server theme preferences.
 */
const THEME_SETTINGS_USER_DATA_KEY = 'settings:theme';

/**
 * Validates and normalizes one raw `UserData.value` theme payload.
 */
export function normalizeThemeSettingsRecord(value: unknown): ThemeSettingsRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        version?: unknown;
        preference?: unknown;
    };

    if (candidate.version !== THEME_SETTINGS_VERSION) {
        return null;
    }

    if (!isAgentsServerThemePreference(candidate.preference)) {
        return null;
    }

    return {
        version: THEME_SETTINGS_VERSION,
        preference: candidate.preference,
    };
}

/**
 * Loads theme settings for the provided user id.
 */
export async function getThemeSettingsForUser(userId: number): Promise<ThemeSettingsRecord | null> {
    const storedValue = await getUserDataValue({
        userId,
        key: THEME_SETTINGS_USER_DATA_KEY,
    });

    return normalizeThemeSettingsRecord(storedValue);
}

/**
 * Persists one explicit theme preference for the provided user id.
 */
export async function setThemeSettingsForUser(
    userId: number,
    preference: AgentsServerThemePreference,
): Promise<ThemeSettingsRecord> {
    const record: ThemeSettingsRecord = {
        version: THEME_SETTINGS_VERSION,
        preference,
    };

    await upsertUserDataValue({
        userId,
        key: THEME_SETTINGS_USER_DATA_KEY,
        value: record,
    });

    return record;
}

/**
 * Clears the stored theme preference so the app falls back to the system theme.
 */
export async function clearThemeSettingsForUser(userId: number): Promise<void> {
    await deleteUserDataByKeysForUser({
        userId,
        keys: [THEME_SETTINGS_USER_DATA_KEY],
    });
}

/**
 * Persists or clears one theme preference for the provided user id.
 */
export async function updateThemeSettingsForUser(
    userId: number,
    preference: AgentsServerThemePreference,
): Promise<ThemeSettingsSnapshot> {
    if (preference === AGENTS_SERVER_THEME_PREFERENCES.SYSTEM) {
        await clearThemeSettingsForUser(userId);
        return { preference: DEFAULT_AGENTS_SERVER_THEME_PREFERENCE };
    }

    const record = await setThemeSettingsForUser(userId, preference);
    return { preference: record.preference };
}

/**
 * Loads the browser-facing theme snapshot for one user.
 */
export async function getThemeSettingsSnapshotForUser(userId: number): Promise<ThemeSettingsSnapshot> {
    const storedSettings = await getThemeSettingsForUser(userId);

    return {
        preference: storedSettings?.preference ?? DEFAULT_AGENTS_SERVER_THEME_PREFERENCE,
    };
}
