import { getMetadata } from '../database/getMetadata';
import { getUserDataValue, upsertUserDataValue } from './userData';
import { DEFAULT_THEME_METADATA_KEY, resolveThemeMode, type ThemeMode } from '../constants/themeMode';

/**
 * Stored theme preference payload persisted in `UserData`.
 */
export type UserThemeModeSettingsRecord = {
    version: 1;
    themeMode: ThemeMode;
};

/**
 * Response payload returned by the theme settings API.
 */
export type UserThemeModeSettingsSnapshot = {
    themeMode: ThemeMode;
};

/**
 * Version marker used by persisted theme settings payloads.
 */
const USER_THEME_MODE_SETTINGS_VERSION = 1 as const;

/**
 * `UserData.key` used for theme preferences.
 */
const USER_THEME_MODE_SETTINGS_USER_DATA_KEY = 'settings:theme-mode';

/**
 * Resolves the server-level default theme mode from metadata.
 */
async function getDefaultThemeModeForServer(): Promise<ThemeMode> {
    return resolveThemeMode(await getMetadata(DEFAULT_THEME_METADATA_KEY));
}

/**
 * Validates and normalizes one raw `UserData.value` theme payload.
 */
export function normalizeUserThemeModeSettingsRecord(value: unknown): UserThemeModeSettingsRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        version?: unknown;
        themeMode?: unknown;
    };

    if (candidate.version !== USER_THEME_MODE_SETTINGS_VERSION) {
        return null;
    }

    return {
        version: USER_THEME_MODE_SETTINGS_VERSION,
        themeMode: resolveThemeMode(candidate.themeMode),
    };
}

/**
 * Loads theme settings for the provided user id.
 */
export async function getUserThemeModeSettingsForUser(userId: number): Promise<UserThemeModeSettingsRecord | null> {
    const storedValue = await getUserDataValue({
        userId,
        key: USER_THEME_MODE_SETTINGS_USER_DATA_KEY,
    });

    return normalizeUserThemeModeSettingsRecord(storedValue);
}

/**
 * Returns a normalized theme snapshot for the provided user id.
 */
export async function getUserThemeModeSettingsSnapshotForUser(userId: number): Promise<UserThemeModeSettingsSnapshot> {
    const storedSettings = await getUserThemeModeSettingsForUser(userId);

    return {
        themeMode: storedSettings?.themeMode || (await getDefaultThemeModeForServer()),
    };
}

/**
 * Persists one theme setting for the provided user id.
 */
export async function setUserThemeModeSettingsForUser(
    userId: number,
    themeMode: ThemeMode,
): Promise<UserThemeModeSettingsRecord> {
    const record: UserThemeModeSettingsRecord = {
        version: USER_THEME_MODE_SETTINGS_VERSION,
        themeMode: resolveThemeMode(themeMode),
    };

    await upsertUserDataValue({
        userId,
        key: USER_THEME_MODE_SETTINGS_USER_DATA_KEY,
        value: record,
    });

    return record;
}
