import { spaceTrim } from 'spacetrim';
import { validateBook, type string_book } from '../../../../../../../src/book-2.0/agent-source/string_book';
import { insertBookContentBeforeLearningMarker } from '../lib/bookSource';
import type { KnowledgeItem, OnboardingState } from '../types';

/**
 * Fallback name used when the imported wizard state has no explicit agent name.
 */
const FALLBACK_AGENT_NAME = 'Nový agent';

/**
 * Returns the source URL for one ready knowledge item.
 *
 * @param item - Knowledge item collected in the wizard.
 * @returns Source URL or an empty string when the item is not ready.
 */
function getKnowledgeSource(item: KnowledgeItem): string {
    if (item.status !== 'ready') {
        return '';
    }

    return item.kind === 'url' ? item.url : item.publicUrl;
}

/**
 * Creates a minimal Book source when the editable Book is empty.
 *
 * @param state - Current wizard state.
 * @returns Book source fallback.
 */
function createFallbackBookSource(state: OnboardingState): string {
    const agentName = state.agentName.trim() || FALLBACK_AGENT_NAME;
    const agentBrief = state.agentBrief.trim() || 'Help users with the assigned business workflow.';

    return spaceTrim(`
        ${agentName}

        NOTE This agent was created via the NEW_AGENT_WIZARD manGo wizard flow

        GOAL ${agentBrief}

        CLOSED
    `);
}

/**
 * Ensures the source begins with an agent title line.
 *
 * @param source - Editable Book source from the wizard.
 * @param agentName - Agent name captured on the first step.
 * @returns Source with a first-line title.
 */
function ensureBookTitle(source: string, agentName: string): string {
    if (source.trim() !== '') {
        return source;
    }

    return agentName.trim() || FALLBACK_AGENT_NAME;
}

/**
 * Builds the final Book source submitted from the manGo wizard.
 *
 * @param state - Current imported wizard state.
 * @returns Validated Book source ready for the existing create-agent action.
 */
export function createManGoAgentSource(state: OnboardingState): string_book {
    const editableSource = state.bookSource.trim() || createFallbackBookSource(state);
    const titledSource = ensureBookTitle(editableSource, state.agentName);
    const knowledgeCommitments = state.knowledge
        .map(getKnowledgeSource)
        .map((source) => source.trim())
        .filter((source) => source !== '')
        .filter((source) => !titledSource.includes(`KNOWLEDGE ${source}`))
        .map((source) => `KNOWLEDGE ${source}`);

    return validateBook(insertBookContentBeforeLearningMarker(titledSource, knowledgeCommitments));
}
