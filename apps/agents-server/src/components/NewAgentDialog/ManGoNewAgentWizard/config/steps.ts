/**
 * The wizard steps shown in the stepper. "Zadání" (the entry screen at `/onboarding`)
 * is intentionally NOT a stepper step — it is the way in, before the book exists.
 */

export type OnboardingStepId = 'book' | 'knowledge' | 'test' | 'done';

export type OnboardingStep = {
    readonly id: OnboardingStepId;
    readonly label: string;
    readonly path: string;
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
    { id: 'book', label: 'Book', path: '/onboarding/book' },
    { id: 'knowledge', label: 'Znalosti', path: '/onboarding/knowledge' },
    { id: 'test', label: 'Test', path: '/onboarding/test' },
    { id: 'done', label: 'Hotovo', path: '/onboarding/done' },
];

export const ONBOARDING_ENTRY_PATH = '/onboarding';

export function getStepIndexByPath(pathname: string): number {
    return ONBOARDING_STEPS.findIndex((step) => step.path === pathname);
}

/**
 * The full flow including the entry "Zadání" screen — used by the rail's vertical stepper
 * and progress so the wizard chrome is consistent on every screen (including the entry).
 */
export type OnboardingFlowStep = {
    readonly id: string;
    readonly label: string;
    readonly path: string;
};

export const ONBOARDING_FLOW: readonly OnboardingFlowStep[] = [
    { id: 'intro', label: 'Zadání', path: ONBOARDING_ENTRY_PATH },
    ...ONBOARDING_STEPS,
];

/** Index of the active flow step for a pathname, or 0 (intro) when nothing matches. */
export function getFlowIndexByPath(pathname: string): number {
    const index = ONBOARDING_FLOW.findIndex((step) => step.path === pathname);
    return index === -1 ? 0 : index;
}
