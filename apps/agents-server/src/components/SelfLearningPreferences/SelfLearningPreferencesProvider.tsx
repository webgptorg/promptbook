'use client';

import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useMemo, useState } from 'react';

const SELF_LEARNING_STORAGE_KEY = 'promptbook-self-learning-enabled';

type SelfLearningPreferencesContextValue = {
    readonly isSelfLearningEnabled: boolean;
    readonly setIsSelfLearningEnabled: Dispatch<SetStateAction<boolean>>;
};

const SelfLearningPreferencesContext = createContext<SelfLearningPreferencesContextValue | null>(null);

type SelfLearningPreferencesProviderProps = {
    readonly children: ReactNode;
};

/**
 * Persists whether self-learning is enabled using local storage and exposes it globally.
 *
 * @private shared helper for the Agents Server UI
 */
export function SelfLearningPreferencesProvider({ children }: SelfLearningPreferencesProviderProps) {
    const [isSelfLearningEnabled, setIsSelfLearningEnabled] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedValue = window.localStorage.getItem(SELF_LEARNING_STORAGE_KEY);
        if (storedValue === 'true' || storedValue === 'false') {
            setIsSelfLearningEnabled(storedValue === 'true');
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(SELF_LEARNING_STORAGE_KEY, isSelfLearningEnabled ? 'true' : 'false');
    }, [isSelfLearningEnabled]);

    const contextValue = useMemo(
        () => ({ isSelfLearningEnabled, setIsSelfLearningEnabled }),
        [isSelfLearningEnabled],
    );

    return <SelfLearningPreferencesContext.Provider value={contextValue}>{children}</SelfLearningPreferencesContext.Provider>;
}

/**
 * Accesses the shared self-learning preference state.
 *
 * @private shared helper for the Agents Server UI
 */
export function useSelfLearningPreferences() {
    const contextValue = useContext(SelfLearningPreferencesContext);

    if (!contextValue) {
        throw new Error('`useSelfLearningPreferences` must be used inside `SelfLearningPreferencesProvider`.');
    }

    return contextValue;
}
