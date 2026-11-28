'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { createOnboardingActions } from './createOnboardingActions';
import type { OnboardingSession } from './createOnboardingSession';

/** Session-bound state/actions exposed to the wizard's step UI. */
type OnboardingContextValue = {
    readonly state: ReturnType<OnboardingSession['getState']>;
    readonly update: OnboardingSession['update'];
    readonly actions: ReturnType<typeof createOnboardingActions>;
    readonly reset: () => void;
};

/** Context is mounted once per host-owned creation identity. */
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Exposes only the explicitly supplied draft; there is no implicit last-draft hydration.
 * Ownership and async work outlive step/provider remounts and end only through the host.
 */
export function OnboardingProvider({
    children,
    session,
    onRestart,
}: {
    readonly children: ReactNode;
    readonly session: OnboardingSession;
    readonly onRestart: () => void;
}) {
    const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
    const actions = useMemo(() => createOnboardingActions(session), [session]);
    const value = useMemo<OnboardingContextValue>(
        () => ({ state, update: session.update, actions, reset: onRestart }),
        [state, session, actions, onRestart],
    );
    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

/** Reads the current creation session, never a browser's previously saved onboarding. */
export function useOnboarding(): OnboardingContextValue {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new NotAllowed('useOnboarding must be used within an <OnboardingProvider>.');
    }
    return context;
}
