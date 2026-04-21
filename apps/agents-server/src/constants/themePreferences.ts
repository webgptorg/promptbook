/**
 * Supported persisted theme preferences for the Agents Server UI.
 */
export const AGENTS_SERVER_THEME_PREFERENCES = {
    SYSTEM: 'SYSTEM',
    LIGHT: 'LIGHT',
    DARK: 'DARK',
} as const;

/**
 * Theme preference saved for one Agents Server user/browser.
 */
export type AgentsServerThemePreference =
    (typeof AGENTS_SERVER_THEME_PREFERENCES)[keyof typeof AGENTS_SERVER_THEME_PREFERENCES];

/**
 * Explicit light/dark theme resolved after applying the system preference.
 */
export type AgentsServerResolvedTheme = Exclude<AgentsServerThemePreference, 'SYSTEM'>;

/**
 * Local storage key used to cache the persisted theme preference in the browser.
 */
export const AGENTS_SERVER_THEME_STORAGE_KEY = 'promptbook_agents_theme_preference';

/**
 * Cookie key used so the server can render the preferred theme without a flash.
 */
export const AGENTS_SERVER_THEME_COOKIE_NAME = 'promptbook_agents_theme_preference';

/**
 * Default preference when no user override has been saved yet.
 */
export const DEFAULT_AGENTS_SERVER_THEME_PREFERENCE: AgentsServerThemePreference =
    AGENTS_SERVER_THEME_PREFERENCES.SYSTEM;

/**
 * Resolves one raw theme preference to a supported value.
 *
 * @param value - Raw cookie, storage, or API value.
 * @returns Safe supported theme preference.
 */
export function resolveAgentsServerThemePreference(
    value: string | null | undefined,
): AgentsServerThemePreference {
    if (value === AGENTS_SERVER_THEME_PREFERENCES.LIGHT) {
        return AGENTS_SERVER_THEME_PREFERENCES.LIGHT;
    }

    if (value === AGENTS_SERVER_THEME_PREFERENCES.DARK) {
        return AGENTS_SERVER_THEME_PREFERENCES.DARK;
    }

    return DEFAULT_AGENTS_SERVER_THEME_PREFERENCE;
}

/**
 * Returns true when the provided raw value is one supported theme preference.
 *
 * @param value - Raw unknown value to validate.
 * @returns Whether the value is one supported theme preference.
 */
export function isAgentsServerThemePreference(value: unknown): value is AgentsServerThemePreference {
    return (
        value === AGENTS_SERVER_THEME_PREFERENCES.SYSTEM ||
        value === AGENTS_SERVER_THEME_PREFERENCES.LIGHT ||
        value === AGENTS_SERVER_THEME_PREFERENCES.DARK
    );
}

/**
 * Resolves the DOM-friendly lowercase theme preference token.
 *
 * @param themePreference - Persisted preference value.
 * @returns Lowercase token stored on the document root.
 */
export function resolveAgentsServerThemePreferenceDomValue(
    themePreference: AgentsServerThemePreference,
): 'system' | 'light' | 'dark' {
    switch (themePreference) {
        case AGENTS_SERVER_THEME_PREFERENCES.DARK:
            return 'dark';
        case AGENTS_SERVER_THEME_PREFERENCES.LIGHT:
            return 'light';
        default:
            return 'system';
    }
}

/**
 * Resolves one raw resolved-theme value to a supported explicit theme.
 *
 * @param value - Raw light/dark token.
 * @returns Safe explicit theme.
 */
export function resolveAgentsServerResolvedTheme(
    value: string | null | undefined,
): AgentsServerResolvedTheme {
    return value === AGENTS_SERVER_THEME_PREFERENCES.DARK
        ? AGENTS_SERVER_THEME_PREFERENCES.DARK
        : AGENTS_SERVER_THEME_PREFERENCES.LIGHT;
}

/**
 * Resolves the DOM-friendly lowercase token for the active explicit theme.
 *
 * @param resolvedTheme - Explicit light/dark theme.
 * @returns Lowercase token stored on the document root.
 */
export function resolveAgentsServerResolvedThemeDomValue(
    resolvedTheme: AgentsServerResolvedTheme,
): 'light' | 'dark' {
    return resolvedTheme === AGENTS_SERVER_THEME_PREFERENCES.DARK ? 'dark' : 'light';
}

/**
 * Resolves the Promptbook component theme token for one explicit Agents Server theme.
 *
 * @param resolvedTheme - Explicit light/dark theme.
 * @returns Promptbook component theme token.
 */
export function resolveAgentsServerPromptbookComponentTheme(
    resolvedTheme: AgentsServerResolvedTheme,
): 'LIGHT' | 'DARK' {
    return resolvedTheme === AGENTS_SERVER_THEME_PREFERENCES.DARK ? 'DARK' : 'LIGHT';
}

/**
 * Resolves the Monaco theme token for one explicit Agents Server theme.
 *
 * @param resolvedTheme - Explicit light/dark theme.
 * @returns Monaco theme token.
 */
export function resolveAgentsServerMonacoTheme(resolvedTheme: AgentsServerResolvedTheme): 'vs-light' | 'vs-dark' {
    return resolvedTheme === AGENTS_SERVER_THEME_PREFERENCES.DARK ? 'vs-dark' : 'vs-light';
}
