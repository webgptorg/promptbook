import { postManGoOnboardingJson } from './postManGoOnboardingJson';

/**
 * Response returned by the manGo Book draft endpoint.
 *
 * @private internal type of the manGo wizard draft service.
 */
type GenerateBookDraftResponse = {
    readonly draft: string;
};

/**
 * Builds the initial Book source for the imported manGo wizard.
 *
 * The external experiment generated a markdown draft through a separate API. The Agents
 * Server creates agents from Book language directly, so this boundary keeps the same
 * loading UX while returning a valid editable Book draft.
 *
 * @param input - Agent name and brief captured by the entry step.
 * @returns Editable Book source used by the following wizard steps.
 */
export async function generateBookDraft(input: {
    readonly agentName: string;
    readonly agentBrief: string;
}): Promise<string> {
    const response = await postManGoOnboardingJson<GenerateBookDraftResponse>('/api/onboarding/draft', {
        agentName: input.agentName,
        agentBrief: input.agentBrief,
    });

    return response.draft;
}
