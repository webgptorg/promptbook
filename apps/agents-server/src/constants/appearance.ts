/**
 * Supported appearance preferences for the Agents Server UI.
 */
export const APPEARANCE_PREFERENCES = {
    SYSTEM: 'system',
    LIGHT: 'light',
    DARK: 'dark',
} as const;

/**
 * Appearance preference selected for this browser.
 */
export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[keyof typeof APPEARANCE_PREFERENCES];

/**
 * Resolved runtime appearance after applying the system preference.
 */
export type ResolvedAppearance = Exclude<AppearancePreference, typeof APPEARANCE_PREFERENCES.SYSTEM>;

/**
 * Local storage key used for per-browser appearance overrides.
 */
export const APPEARANCE_STORAGE_KEY = 'promptbook_agents_appearance';

/**
 * Cookie key used so server-rendered pages can respect browser appearance overrides.
 */
export const APPEARANCE_COOKIE_NAME = 'promptbook_agents_appearance';

/**
 * Default appearance preference when nothing else is configured.
 */
export const DEFAULT_APPEARANCE_PREFERENCE: AppearancePreference = APPEARANCE_PREFERENCES.SYSTEM;

/**
 * Resolves one raw appearance preference value to a supported preference.
 *
 * @param value - Raw metadata/cookie/local-storage value.
 * @returns Safe supported appearance preference.
 */
export function resolveAppearancePreference(value: string | null | undefined): AppearancePreference {
    switch (value) {
        case APPEARANCE_PREFERENCES.DARK:
            return APPEARANCE_PREFERENCES.DARK;
        case APPEARANCE_PREFERENCES.LIGHT:
            return APPEARANCE_PREFERENCES.LIGHT;
        default:
            return APPEARANCE_PREFERENCES.SYSTEM;
    }
}

/**
 * Resolves the concrete appearance currently applied in the browser.
 *
 * @param appearancePreference - Stored browser appearance preference.
 * @param isSystemDarkMode - Indicates whether the operating system prefers dark mode.
 * @returns Concrete light/dark appearance used for rendering.
 */
export function resolveResolvedAppearance(
    appearancePreference: AppearancePreference,
    isSystemDarkMode: boolean,
): ResolvedAppearance {
    if (appearancePreference === APPEARANCE_PREFERENCES.SYSTEM) {
        return isSystemDarkMode ? APPEARANCE_PREFERENCES.DARK : APPEARANCE_PREFERENCES.LIGHT;
    }

    return appearancePreference;
}
