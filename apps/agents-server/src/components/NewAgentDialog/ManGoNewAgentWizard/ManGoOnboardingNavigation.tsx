'use client';

import { createContext, useContext } from 'react';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';

/**
 * In-dialog navigation context used by the imported manGo onboarding wizard.
 *
 * @private internal context of <ManGoNewAgentWizard/>.
 */
type ManGoOnboardingNavigationContextValue = {
    /**
     * Current wizard path mirrored from the original route-based onboarding flow.
     */
    readonly currentPath: string;

    /**
     * Moves the fullscreen wizard to another original onboarding path.
     */
    readonly navigateToPath: (path: string) => void;

    /**
     * Requests closing the fullscreen wizard.
     */
    readonly requestClose: () => void;
};

/**
 * React context carrying the local wizard navigation state.
 *
 * @private internal context of <ManGoNewAgentWizard/>.
 */
export const ManGoOnboardingNavigationContext = createContext<ManGoOnboardingNavigationContextValue | null>(null);

/**
 * Reads the current in-dialog manGo onboarding navigation state.
 *
 * @returns Navigation helpers scoped to the current wizard.
 *
 * @private internal hook of <ManGoNewAgentWizard/>.
 */
export function useManGoOnboardingNavigation(): ManGoOnboardingNavigationContextValue {
    const context = useContext(ManGoOnboardingNavigationContext);

    if (!context) {
        throw new NotAllowed('useManGoOnboardingNavigation must be used within <ManGoOnboardingNavigationContext>.');
    }

    return context;
}
