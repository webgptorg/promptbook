/** Obsolete, unscoped snapshot owned exclusively by the imported manGo wizard. */
const LEGACY_ONBOARDING_STORAGE_KEY = 'onboarding:v2';

/**
 * Retires only the obsolete wizard entry. It is never read or imported into a draft.
 * No storage access is required for creation, including private mode or exhausted quotas.
 */
export function retireLegacyOnboardingSnapshot(): void {
    try {
        window.sessionStorage.removeItem(LEGACY_ONBOARDING_STORAGE_KEY);
    } catch {
        // An unavailable store cannot compromise the independent in-memory session.
    }
}
