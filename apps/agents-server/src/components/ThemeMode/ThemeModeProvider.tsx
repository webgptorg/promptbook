'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { notifyError } from '../Notifications/notifications';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import {
    DEFAULT_THEME_MODE,
    resolveResolvedThemeMode,
    resolveThemeMode,
    THEME_MODE_COOKIE_MAX_AGE_SECONDS,
    THEME_MODE_COOKIE_NAME,
    THEME_MODE_STORAGE_KEY,
    type ResolvedThemeMode,
    type ThemeMode,
} from '../../constants/themeMode';
import { fetchThemeModeSettings, updateThemeModeSettings } from '../../utils/themeModeClient';

/**
 * Shared theme mode state exposed across the Agents Server client UI.
 */
type ThemeModeContextValue = {
    readonly themeMode: ThemeMode;
    readonly resolvedThemeMode: ResolvedThemeMode;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly setThemeMode: (themeMode: ThemeMode) => Promise<void>;
};

/**
 * Default context value used before the provider mounts.
 */
const defaultThemeModeContextValue: ThemeModeContextValue = {
    themeMode: DEFAULT_THEME_MODE,
    resolvedThemeMode: 'LIGHT',
    isLoading: true,
    isPersisting: false,
    setThemeMode: async () => undefined,
};

/**
 * React context storing the current theme mode preference.
 */
const ThemeModeContext = createContext<ThemeModeContextValue>(defaultThemeModeContextValue);

/**
 * Props accepted by the theme mode provider.
 */
type ThemeModeProviderProps = {
    readonly children: ReactNode;
    readonly defaultThemeMode?: string | null;
};

/**
 * Applies one theme mode to the root HTML element and mirrors it into browser storage.
 */
function applyThemeModeToDocument(themeMode: ThemeMode): ResolvedThemeMode {
    const isSystemDark =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedThemeMode = resolveResolvedThemeMode(themeMode, isSystemDark);

    if (typeof document !== 'undefined') {
        const rootElement = document.documentElement;
        rootElement.dataset.themeMode = themeMode.toLowerCase();
        rootElement.dataset.themeResolved = resolvedThemeMode.toLowerCase();
        rootElement.classList.toggle('dark', resolvedThemeMode === 'DARK');
        rootElement.style.colorScheme = resolvedThemeMode.toLowerCase();
    }

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
        } catch {
            // Best-effort mirroring only.
        }

        document.cookie = `${THEME_MODE_COOKIE_NAME}=${themeMode}; path=/; max-age=${THEME_MODE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    }

    return resolvedThemeMode;
}

/**
 * Persists the global Agents Server theme preference, follows system theme when requested,
 * and keeps the root document classes in sync.
 *
 * @private shared helper for the Agents Server UI
 */
export function ThemeModeProvider({ children, defaultThemeMode }: ThemeModeProviderProps) {
    const { t } = useServerLanguage();
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => resolveThemeMode(defaultThemeMode));
    const [resolvedThemeMode, setResolvedThemeMode] = useState<ResolvedThemeMode>(() =>
        resolveThemeMode(defaultThemeMode) === 'DARK' ? 'DARK' : 'LIGHT',
    );
    const [isLoading, setIsLoading] = useState(true);
    const [pendingPersistCount, setPendingPersistCount] = useState(0);
    const themeModeRef = useRef(themeMode);
    const hasLocalThemeModeRef = useRef(false);
    const hasLocalMutationRef = useRef(false);
    const loadPromiseRef = useRef<Promise<void> | null>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        themeModeRef.current = themeMode;
        setResolvedThemeMode(applyThemeModeToDocument(themeMode));
    }, [themeMode]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const currentResolvedTheme = resolveThemeMode(document.documentElement.dataset.themeResolved?.toUpperCase());
        if (currentResolvedTheme !== 'SYSTEM') {
            setResolvedThemeMode(currentResolvedTheme);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const storedThemeMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
            if (storedThemeMode) {
                hasLocalThemeModeRef.current = true;
                setThemeModeState((currentThemeMode) => {
                    const resolvedStoredThemeMode = resolveThemeMode(storedThemeMode);
                    return currentThemeMode === resolvedStoredThemeMode ? currentThemeMode : resolvedStoredThemeMode;
                });
            }
        } catch {
            // Ignore browser storage failures and continue with the server default.
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemThemeChange = () => {
            if (themeModeRef.current === 'SYSTEM') {
                setResolvedThemeMode(applyThemeModeToDocument(themeModeRef.current));
            }
        };

        handleSystemThemeChange();

        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== THEME_MODE_STORAGE_KEY || !event.newValue) {
                return;
            }

            hasLocalThemeModeRef.current = true;
            setThemeModeState(resolveThemeMode(event.newValue));
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    /**
     * Loads the latest persisted theme preference for the current browser user.
     */
    const loadThemeMode = useCallback(async () => {
        if (loadPromiseRef.current) {
            return loadPromiseRef.current;
        }

        loadPromiseRef.current = (async () => {
            try {
                const snapshot = await fetchThemeModeSettings();

                if (hasLocalThemeModeRef.current || hasLocalMutationRef.current) {
                    return;
                }

                setThemeModeState((currentThemeMode) =>
                    currentThemeMode === snapshot.themeMode ? currentThemeMode : snapshot.themeMode,
                );
            } catch (error) {
                console.error('[theme-mode] Failed to load theme settings.', error);
            } finally {
                setIsLoading(false);
                loadPromiseRef.current = null;
            }
        })();

        return loadPromiseRef.current;
    }, []);

    useEffect(() => {
        void loadThemeMode();
    }, [loadThemeMode]);

    /**
     * Queues one save request so repeated theme changes stay ordered.
     */
    const persistThemeMode = useCallback(
        async (nextThemeMode: ThemeMode): Promise<void> => {
            setPendingPersistCount((previousCount) => previousCount + 1);

            const persistencePromise = saveQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    try {
                        await updateThemeModeSettings(nextThemeMode);
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
     * Applies one selected theme mode immediately and persists it in the background queue.
     */
    const setThemeMode = useCallback(
        async (nextThemeMode: ThemeMode) => {
            const resolvedThemeMode = resolveThemeMode(nextThemeMode);
            hasLocalMutationRef.current = true;
            hasLocalThemeModeRef.current = true;
            setThemeModeState((currentThemeMode) =>
                currentThemeMode === resolvedThemeMode ? currentThemeMode : resolvedThemeMode,
            );

            await persistThemeMode(resolvedThemeMode).catch(() => undefined);
        },
        [persistThemeMode],
    );

    const contextValue = useMemo<ThemeModeContextValue>(
        () => ({
            themeMode,
            resolvedThemeMode,
            isLoading,
            isPersisting: pendingPersistCount > 0,
            setThemeMode,
        }),
        [isLoading, pendingPersistCount, resolvedThemeMode, setThemeMode, themeMode],
    );

    return <ThemeModeContext.Provider value={contextValue}>{children}</ThemeModeContext.Provider>;
}

/**
 * Reads the active Agents Server theme mode context.
 */
export function useThemeMode(): ThemeModeContextValue {
    return useContext(ThemeModeContext);
}
