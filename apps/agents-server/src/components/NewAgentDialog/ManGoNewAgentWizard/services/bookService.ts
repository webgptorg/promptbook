import { postManGoOnboardingJson } from './postManGoOnboardingJson';

/**
 * Response returned by the manGo Book generation endpoint.
 *
 * @private internal type of the manGo wizard book service.
 */
type GenerateBookResponse = {
    readonly book: string;
};

/**
 * Generates the initial Book directly from the assignment step.
 *
 * @param input - Agent name and brief captured by the entry step.
 * @returns Editable Book source used by the following wizard steps.
 */
export async function generateBook(input: {
    readonly agentName: string;
    readonly agentBrief: string;
}): Promise<string> {
    const response = await postManGoOnboardingJson<GenerateBookResponse>('/api/onboarding/book', {
        agentName: input.agentName,
        agentBrief: input.agentBrief,
    });

    return response.book;
}
