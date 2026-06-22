import { spaceTrim } from 'spacetrim';

/**
 * Normalizes one user-entered single-line wizard value.
 *
 * @param value - Raw user-entered value.
 * @returns Trimmed single-line text.
 *
 * @private internal helper of the manGo wizard draft service.
 */
function normalizeSingleLineInput(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

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
    const agentName = normalizeSingleLineInput(input.agentName) || 'Nový agent';
    const agentBrief = normalizeSingleLineInput(input.agentBrief);

    return spaceTrim(`
        ${agentName}

        NOTE This agent was created via the NEW_AGENT_WIZARD manGo wizard flow

        GOAL ${agentBrief || 'Help users with the assigned business workflow.'}

        RULE Answer clearly and practically.
        RULE Ask a clarifying question when the request is ambiguous.
        RULE Escalate risky, unclear, or out-of-scope requests to a human.

        CLOSED
    `);
}
