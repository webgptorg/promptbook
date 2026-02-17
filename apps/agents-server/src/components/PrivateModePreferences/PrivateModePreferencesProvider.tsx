'use client';

import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useMemo, useState } from 'react';
import { PRIVATE_MODE_COOKIE_NAME, PRIVATE_MODE_STORAGE_KEY } from '@/src/constants/privateMode';

type PrivateModePreferencesContextValue = {
    readonly isPrivateModeEnabled: boolean;
    readonly setIsPrivateModeEnabled: Dispatch<SetStateAction<boolean>>;
};

const PrivateModePreferencesContext = createContext<PrivateModePreferencesContextValue | null>(null);

type PrivateModePreferencesProviderProps = {
    readonly children: ReactNode;
};

/**
 * Persists whether private mode is enabled using local storage and exposes it globally.
 *
 * @private shared helper for the Agents Server UI
 */
export function PrivateModePreferencesProvider({ children }: PrivateModePreferencesProviderProps) {
    const [isPrivateModeEnabled, setIsPrivateModeEnabled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedValue = window.localStorage.getItem(PRIVATE_MODE_STORAGE_KEY);
        if (storedValue === 'true' || storedValue === 'false') {
            setIsPrivateModeEnabled(storedValue === 'true');
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(PRIVATE_MODE_STORAGE_KEY, isPrivateModeEnabled ? 'true' : 'false');
        document.cookie = `${PRIVATE_MODE_COOKIE_NAME}=${isPrivateModeEnabled ? 'true' : 'false'}; path=/; max-age=31536000; samesite=lax`;
    }, [isPrivateModeEnabled]);

    const contextValue = useMemo(
        () => ({ isPrivateModeEnabled, setIsPrivateModeEnabled }),
        [isPrivateModeEnabled],
    );

    return <PrivateModePreferencesContext.Provider value={contextValue}>{children}</PrivateModePreferencesContext.Provider>;
}

/**
 * Accesses the private mode preference state.
 *
 * @private shared helper for the Agents Server UI
 */
export function usePrivateModePreferences() {
    const contextValue = useContext(PrivateModePreferencesContext);

    if (!contextValue) {
        throw new Error('`usePrivateModePreferences` must be used inside `PrivateModePreferencesProvider`.');
    }

    return contextValue;
}
