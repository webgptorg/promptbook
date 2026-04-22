/**
 * All theme modes supported by the Agents Server UI.
 */
export const THEME_MODES = {
    SYSTEM: 'SYSTEM',
    LIGHT: 'LIGHT',
    DARK: 'DARK',
} as const;

/**
 * Theme mode selected by the user.
 */
export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];

/**
 * Concrete theme resolved for actual rendering.
 */
export type ResolvedThemeMode = Exclude<ThemeMode, 'SYSTEM'>;

/**
 * Default theme mode applied when no user preference has been saved yet.
 */
export const DEFAULT_THEME_MODE: ThemeMode = THEME_MODES.SYSTEM;

/**
 * Local storage key used to keep the latest browser theme mode in sync.
 */
export const THEME_MODE_STORAGE_KEY = 'agents-server-theme-mode';

/**
 * Cookie key used so the server can preload the preferred theme mode.
 */
export const THEME_MODE_COOKIE_NAME = 'agentsServerThemeMode';

/**
 * Cookie lifetime for persisted theme preferences.
 */
export const THEME_MODE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Fast lookup set used by the theme-mode validators.
 */
const THEME_MODE_SET = new Set<ThemeMode>(Object.values(THEME_MODES));

/**
 * Returns true when the supplied value is one of the supported theme modes.
 */
export function isThemeMode(value: unknown): value is ThemeMode {
    return typeof value === 'string' && THEME_MODE_SET.has(value as ThemeMode);
}

/**
 * Normalizes an unknown value into one supported theme mode.
 */
export function resolveThemeMode(value: unknown): ThemeMode {
    return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

/**
 * Resolves the concrete light/dark theme used for rendering.
 */
export function resolveResolvedThemeMode(themeMode: ThemeMode, isSystemDark: boolean): ResolvedThemeMode {
    if (themeMode === THEME_MODES.SYSTEM) {
        return isSystemDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    }

    return themeMode;
}
