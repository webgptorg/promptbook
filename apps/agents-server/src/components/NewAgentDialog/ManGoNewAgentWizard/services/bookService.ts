import { postManGoOnboardingJson } from './postManGoOnboardingJson';

/**
 * Response returned by the manGo Book conversion endpoint.
 *
 * @private internal type of the manGo wizard book service.
 */
type ConvertToBookResponse = {
    readonly book: string;
    readonly isValid: boolean;
};

/**
 * Boundary used by the imported Book language panel. Backed by the manGo book expert.
 *
 * @param input - Current Book editor content.
 * @returns Validated Book source and validation flag for the panel badge.
 */
export async function convertToBook(input: string): Promise<{ book: string; isValid: boolean }> {
    return postManGoOnboardingJson<ConvertToBookResponse>('/api/onboarding/book', { input });
}
