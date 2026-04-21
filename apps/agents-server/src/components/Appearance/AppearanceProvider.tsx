'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import {
    APPEARANCE_COOKIE_NAME,
    APPEARANCE_PREFERENCES,
    APPEARANCE_STORAGE_KEY,
    DEFAULT_APPEARANCE_PREFERENCE,
    resolveAppearancePreference,
    resolveResolvedAppearance,
    type AppearancePreference,
    type ResolvedAppearance,
} from '../../constants/appearance';

/**
 * Media query tracking the operating-system appearance.
 */
const APPEARANCE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Shared appearance context value used across the Agents Server UI.
 */
type AppearanceContextValue = {
    /**
     * Stored browser appearance preference.
     */
    readonly appearance: AppearancePreference;
    /**
     * Setter used by settings and control-panel overrides.
     */
    readonly setAppearance: Dispatch<SetStateAction<AppearancePreference>>;
    /**
     * Concrete light/dark appearance currently applied in the browser.
     */
    readonly resolvedAppearance: ResolvedAppearance;
};

/**
 * Props accepted by the appearance provider.
 */
type AppearanceProviderProps = {
    /**
     * Children that can access the appearance state.
     */
    readonly children: ReactNode;
    /**
     * Default browser appearance preference resolved on the server from cookies.
     */
    readonly defaultAppearance?: string | null;
};

/**
 * Default appearance context used before the provider mounts.
 */
const defaultAppearanceContextValue: AppearanceContextValue = {
    appearance: DEFAULT_APPEARANCE_PREFERENCE,
    setAppearance: (nextAppearance) => {
        void nextAppearance;
    },
    resolvedAppearance: APPEARANCE_PREFERENCES.LIGHT,
};

/**
 * Constant for appearance context.
 */
const AppearanceContext = createContext<AppearanceContextValue>(defaultAppearanceContextValue);

/**
 * Resolves the current operating-system dark mode preference in the browser.
 *
 * @returns Whether the system currently prefers dark mode.
 */
function resolveInitialSystemDarkMode(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(APPEARANCE_MEDIA_QUERY).matches;
}

/**
 * Applies appearance state to the root document element so CSS can react immediately.
 *
 * @param appearance - Stored browser appearance preference.
 * @param resolvedAppearance - Concrete light/dark appearance applied right now.
 */
function applyAppearanceAttributes(appearance: AppearancePreference, resolvedAppearance: ResolvedAppearance): void {
    document.documentElement.dataset.appearance = appearance;
    document.documentElement.dataset.resolvedAppearance = resolvedAppearance;
    document.documentElement.style.colorScheme = resolvedAppearance;
}

/**
 * Provides one shared browser appearance preference for the Agents Server UI.
 *
 * @private shared helper for the Agents Server UI
 */
export function AppearanceProvider({ children, defaultAppearance }: AppearanceProviderProps) {
    const [appearance, setAppearance] = useState<AppearancePreference>(() =>
        resolveAppearancePreference(defaultAppearance),
    );
    const [isSystemDarkMode, setIsSystemDarkMode] = useState(resolveInitialSystemDarkMode);

    useEffect(() => {
        setAppearance(resolveAppearancePreference(defaultAppearance));
    }, [defaultAppearance]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedAppearance = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (!storedAppearance) {
            return;
        }

        const resolvedStoredAppearance = resolveAppearancePreference(storedAppearance);
        setAppearance((currentAppearance) =>
            currentAppearance === resolvedStoredAppearance ? currentAppearance : resolvedStoredAppearance,
        );
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQueryList = window.matchMedia(APPEARANCE_MEDIA_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            setIsSystemDarkMode(event.matches);
        };

        setIsSystemDarkMode(mediaQueryList.matches);

        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', handleChange);

            return () => {
                mediaQueryList.removeEventListener('change', handleChange);
            };
        }

        mediaQueryList.addListener(handleChange);

        return () => {
            mediaQueryList.removeListener(handleChange);
        };
    }, []);

    const resolvedAppearance = useMemo<ResolvedAppearance>(
        () => resolveResolvedAppearance(appearance, isSystemDarkMode),
        [appearance, isSystemDarkMode],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
        document.cookie = `${APPEARANCE_COOKIE_NAME}=${appearance}; path=/; max-age=31536000; samesite=lax`;
        applyAppearanceAttributes(appearance, resolvedAppearance);
    }, [appearance, resolvedAppearance]);

    const contextValue = useMemo<AppearanceContextValue>(
        () => ({
            appearance,
            setAppearance,
            resolvedAppearance,
        }),
        [appearance, resolvedAppearance],
    );

    return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>;
}

/**
 * Reads the active appearance context.
 *
 * @returns Active appearance preference, resolved theme, and setter.
 */
export function useAppearance() {
    return useContext(AppearanceContext);
}
