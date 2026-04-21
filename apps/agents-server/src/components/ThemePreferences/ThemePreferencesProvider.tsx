'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    AGENTS_SERVER_THEME_COOKIE_NAME,
    AGENTS_SERVER_THEME_PREFERENCES,
    AGENTS_SERVER_THEME_STORAGE_KEY,
    resolveAgentsServerResolvedTheme,
    resolveAgentsServerResolvedThemeDomValue,
    resolveAgentsServerThemePreference,
    resolveAgentsServerThemePreferenceDomValue,
    type AgentsServerResolvedTheme,
    type AgentsServerThemePreference,
} from '../../constants/themePreferences';
import { fetchThemeSettings, updateThemeSettings } from '../../utils/themeSettingsClient';
import { notifyError } from '../Notifications/notifications';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Shared theme preference context value for the Agents Server UI.
 */
type ThemePreferencesContextValue = {
    /**
     * Stored user preference currently active in this browser.
     */
    readonly themePreference: AgentsServerThemePreference;
    /**
     * Effective explicit theme after resolving the system preference.
     */
    readonly resolvedTheme: AgentsServerResolvedTheme;
    /**
     * Returns true when the active resolved theme is dark.
     */
    readonly isDarkTheme: boolean;
    /**
     * Indicates whether persisted settings are still loading.
     */
    readonly isLoading: boolean;
    /**
     * Indicates whether a theme change is currently being persisted.
     */
    readonly isPersisting: boolean;
    /**
     * Persists a new theme preference for the current browser user.
     */
    readonly setThemePreference: (themePreference: AgentsServerThemePreference) => Promise<void>;
};

/**
 * Props accepted by the shared theme preference provider.
 */
type ThemePreferencesProviderProps = {
    /**
     * Client subtree that can access the theme preference state.
     */
    readonly children: ReactNode;
    /**
     * Preference resolved on the server from cookies during the initial render.
     */
    readonly defaultThemePreference?: string | null;
};

/**
 * Media query used to follow the operating-system/browser dark mode.
 */
const PREFERS_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Context storing the active theme preference.
 */
const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null);

/**
 * Resolves the current explicit theme for one preference using the browser's system setting.
 */
function resolveThemePreferenceAgainstSystem(
    themePreference: AgentsServerThemePreference,
): AgentsServerResolvedTheme {
    if (themePreference === AGENTS_SERVER_THEME_PREFERENCES.DARK) {
        return AGENTS_SERVER_THEME_PREFERENCES.DARK;
    }

    if (themePreference === AGENTS_SERVER_THEME_PREFERENCES.LIGHT) {
        return AGENTS_SERVER_THEME_PREFERENCES.LIGHT;
    }

    if (typeof window !== 'undefined' && window.matchMedia(PREFERS_DARK_MEDIA_QUERY).matches) {
        return AGENTS_SERVER_THEME_PREFERENCES.DARK;
    }

    return AGENTS_SERVER_THEME_PREFERENCES.LIGHT;
}

/**
 * Applies the current theme preference and explicit theme to the document root.
 */
function applyThemePreferenceToDocument(
    themePreference: AgentsServerThemePreference,
    resolvedTheme: AgentsServerResolvedTheme,
): void {
    if (typeof document === 'undefined') {
        return;
    }

    const documentRoot = document.documentElement;
    const themePreferenceDomValue = resolveAgentsServerThemePreferenceDomValue(themePreference);
    const resolvedThemeDomValue = resolveAgentsServerResolvedThemeDomValue(resolvedTheme);

    documentRoot.dataset.agentsThemePreference = themePreferenceDomValue;
    documentRoot.dataset.agentsThemeResolved = resolvedThemeDomValue;
    documentRoot.style.colorScheme = resolvedThemeDomValue;
}

/**
 * Caches the current theme preference in browser storage and cookies so the next SSR render can match it.
 */
function cacheThemePreference(themePreference: AgentsServerThemePreference): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    window.localStorage.setItem(AGENTS_SERVER_THEME_STORAGE_KEY, themePreference);
    document.cookie = `${AGENTS_SERVER_THEME_COOKIE_NAME}=${themePreference}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Provides one shared persisted theme preference for the entire Agents Server app.
 *
 * The source of truth is stored in `UserData`, while local storage and cookies are
 * used as a fast cache so the next server render can avoid a theme flash.
 *
 * @private shared helper for the Agents Server UI
 */
export function ThemePreferencesProvider({
    children,
    defaultThemePreference,
}: ThemePreferencesProviderProps) {
    const { t } = useServerLanguage();
    const [themePreference, setThemePreferenceState] = useState<AgentsServerThemePreference>(() =>
        resolveAgentsServerThemePreference(defaultThemePreference),
    );
    const [resolvedTheme, setResolvedTheme] = useState<AgentsServerResolvedTheme>(() =>
        resolveThemePreferenceAgainstSystem(resolveAgentsServerThemePreference(defaultThemePreference)),
    );
    const [isLoading, setIsLoading] = useState(true);
    const [pendingPersistCount, setPendingPersistCount] = useState(0);
    const loadPromiseRef = useRef<Promise<void> | null>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        const nextResolvedTheme = resolveThemePreferenceAgainstSystem(themePreference);
        setResolvedTheme((currentResolvedTheme) =>
            currentResolvedTheme === nextResolvedTheme ? currentResolvedTheme : nextResolvedTheme,
        );
    }, [themePreference]);

    useEffect(() => {
        applyThemePreferenceToDocument(themePreference, resolvedTheme);
        cacheThemePreference(themePreference);
    }, [themePreference, resolvedTheme]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const rawCachedThemePreference = window.localStorage.getItem(AGENTS_SERVER_THEME_STORAGE_KEY);
        if (!rawCachedThemePreference) {
            return;
        }

        const cachedThemePreference = resolveAgentsServerThemePreference(rawCachedThemePreference);

        setThemePreferenceState((currentThemePreference) =>
            currentThemePreference === cachedThemePreference ? currentThemePreference : cachedThemePreference,
        );
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQueryList = window.matchMedia(PREFERS_DARK_MEDIA_QUERY);

        const syncResolvedTheme = () => {
            if (themePreference !== AGENTS_SERVER_THEME_PREFERENCES.SYSTEM) {
                return;
            }

            setResolvedTheme(resolveThemePreferenceAgainstSystem(AGENTS_SERVER_THEME_PREFERENCES.SYSTEM));
        };

        syncResolvedTheme();
        mediaQueryList.addEventListener('change', syncResolvedTheme);

        return () => {
            mediaQueryList.removeEventListener('change', syncResolvedTheme);
        };
    }, [themePreference]);

    /**
     * Loads persisted theme settings for the current browser user.
     */
    const loadThemePreference = useCallback(async () => {
        if (loadPromiseRef.current) {
            return loadPromiseRef.current;
        }

        loadPromiseRef.current = (async () => {
            try {
                const snapshot = await fetchThemeSettings();
                setThemePreferenceState((currentThemePreference) =>
                    currentThemePreference === snapshot.preference ? currentThemePreference : snapshot.preference,
                );
            } catch (error) {
                console.error('[theme] Failed to load persisted theme settings.', error);
            } finally {
                setIsLoading(false);
                loadPromiseRef.current = null;
            }
        })();

        return loadPromiseRef.current;
    }, []);

    useEffect(() => {
        void loadThemePreference();
    }, [loadThemePreference]);

    /**
     * Persists theme changes in order so rapid selection changes stay consistent.
     */
    const persistThemePreference = useCallback(
        async (nextThemePreference: AgentsServerThemePreference): Promise<void> => {
            setPendingPersistCount((previousCount) => previousCount + 1);

            const persistencePromise = saveQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    try {
                        await updateThemeSettings(nextThemePreference);
                    } catch (error) {
                        notifyError(t('controlPanel.themeSaveFailed'));
                        throw error;
                    } finally {
                        setPendingPersistCount((previousCount) => Math.max(0, previousCount - 1));
                    }
                });

            saveQueueRef.current = persistencePromise.catch(() => undefined);
            await persistencePromise;
        },
        [t],
    );

    /**
     * Applies a new preference immediately and persists it in the background queue.
     */
    const setThemePreference = useCallback(
        async (nextThemePreference: AgentsServerThemePreference): Promise<void> => {
            setThemePreferenceState(nextThemePreference);
            await persistThemePreference(nextThemePreference).catch(() => undefined);
        },
        [persistThemePreference],
    );

    const contextValue = useMemo<ThemePreferencesContextValue>(
        () => ({
            themePreference,
            resolvedTheme,
            isDarkTheme: resolvedTheme === AGENTS_SERVER_THEME_PREFERENCES.DARK,
            isLoading,
            isPersisting: pendingPersistCount > 0,
            setThemePreference,
        }),
        [isLoading, pendingPersistCount, resolvedTheme, setThemePreference, themePreference],
    );

    return <ThemePreferencesContext.Provider value={contextValue}>{children}</ThemePreferencesContext.Provider>;
}

/**
 * Reads the shared Agents Server theme preference state.
 *
 * @private shared helper for the Agents Server UI
 */
export function useThemePreferences() {
    const contextValue = useContext(ThemePreferencesContext);

    if (!contextValue) {
        throw new Error('`useThemePreferences` must be used inside `ThemePreferencesProvider`.');
    }

    return contextValue;
}
