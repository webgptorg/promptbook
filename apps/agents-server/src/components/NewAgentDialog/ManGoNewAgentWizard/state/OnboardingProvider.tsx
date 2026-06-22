'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';

import type { OnboardingState } from '../types';

/** sessionStorage key for the wizard session — exported so callers (e.g. the dashboard's
 * "Nový onboarding") can clear a stale draft before starting fresh. */
export const ONBOARDING_STORAGE_KEY = 'onboarding:v1';
const STORAGE_KEY = ONBOARDING_STORAGE_KEY;

const INITIAL_STATE: OnboardingState = {
    agentName: '',
    agentBrief: '',
    bookSource: '',
    knowledge: [],
    testMessages: [],
    savedAgentId: null,
    savedAgentTargetPath: null,
};

type OnboardingPatch = Partial<OnboardingState> | ((previous: OnboardingState) => Partial<OnboardingState>);

type OnboardingContextValue = {
    readonly state: OnboardingState;
    /** True once the initial `sessionStorage` hydration has run (client-only). */
    readonly isHydrated: boolean;
    /**
     * Shallow-merges a patch into the state and writes it through to `sessionStorage`.
     * Accepts a function form for updates that depend on the latest state (e.g. mutating
     * the knowledge list from several concurrent uploads).
     */
    readonly update: (patch: OnboardingPatch) => void;
    /** Clears the session (state + storage). */
    readonly reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function readPersistedState(): OnboardingState | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        return raw ? { ...INITIAL_STATE, ...(JSON.parse(raw) as Partial<OnboardingState>) } : null;
    } catch {
        return null;
    }
}

function writePersistedState(state: OnboardingState): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage failures (private mode, quota) — state still lives in memory.
    }
}

/**
 * Holds the whole wizard state for one onboarding session.
 *
 * Mounted by the `/onboarding` layout route so the state survives navigation between
 * steps. Hydration from `sessionStorage` happens after the first client render to avoid
 * an SSR/CSR mismatch; subsequent writes are write-through.
 */
export function OnboardingProvider({ children }: { readonly children: React.ReactNode }) {
    const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const persisted = readPersistedState();
        if (persisted) {
            setState(persisted);
        }
        setIsHydrated(true);
    }, []);

    const update = useCallback((patch: OnboardingPatch) => {
        setState((previous) => {
            const resolved = typeof patch === 'function' ? patch(previous) : patch;
            const next = { ...previous, ...resolved };
            writePersistedState(next);
            return next;
        });
    }, []);

    const reset = useCallback(() => {
        setState(INITIAL_STATE);
        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore.
            }
        }
    }, []);

    const value = useMemo<OnboardingContextValue>(
        () => ({ state, isHydrated, update, reset }),
        [state, isHydrated, update, reset],
    );

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
    const context = useContext(OnboardingContext);

    if (!context) {
        throw new NotAllowed('useOnboarding must be used within an <OnboardingProvider>.');
    }

    return context;
}
