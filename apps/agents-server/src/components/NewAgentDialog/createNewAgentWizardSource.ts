import { spaceTrim } from 'spacetrim';
import { validateBook, type string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * One knowledge source collected by the wizard.
 */
export type NewAgentWizardKnowledgeItem = {
    /**
     * Human-friendly label shown in review screens and traceability notes.
     */
    readonly label: string;
    /**
     * Final source value written into the `KNOWLEDGE` commitment.
     */
    readonly source: string;
};

/**
 * Capability commitments supported by the guided wizard.
 */
export type NewAgentWizardCapabilityCommitment = 'USE BROWSER' | 'USE SEARCH ENGINE';

/**
 * Data required to synthesize the hidden book source from the wizard form.
 */
export type CreateNewAgentWizardSourceOptions = {
    /**
     * Required agent name written into the book title.
     */
    readonly agentName: string;
    /**
     * Optional short description persisted as `META DESCRIPTION`.
     */
    readonly description?: string;
    /**
     * Persona fragments selected from the preset chips.
     */
    readonly personaTraits: ReadonlyArray<string>;
    /**
     * Rule commitments collected from default toggles.
     */
    readonly rules: ReadonlyArray<string>;
    /**
     * Tool capability commitments selected in the wizard.
     */
    readonly capabilityCommitments: ReadonlyArray<NewAgentWizardCapabilityCommitment>;
    /**
     * Knowledge sources uploaded or pasted in the wizard.
     */
    readonly knowledgeItems: ReadonlyArray<NewAgentWizardKnowledgeItem>;
};

/**
 * Builds one book-language commitment line, preserving multiline content when needed.
 *
 * @param keyword - Commitment keyword.
 * @param content - Optional commitment content.
 * @returns Formatted commitment line.
 */
function createCommitment(keyword: string, content?: string): string {
    const normalizedContent = spaceTrim(content || '');
    return normalizedContent === '' ? keyword : `${keyword} ${normalizedContent}`;
}

/**
 * Formats a short summary list for the traceability note.
 *
 * @param items - Items to summarize.
 * @param emptyFallback - Fallback text when no items are present.
 * @returns Human-readable summary string.
 */
function formatSummaryList(items: ReadonlyArray<string>, emptyFallback: string): string {
    return items.length > 0 ? items.join(', ') : emptyFallback;
}

/**
 * Normalizes optional single-line user input.
 *
 * @param value - Raw user input.
 * @returns Trimmed single-line text or an empty string.
 */
function normalizeSingleLine(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}

/**
 * Builds the hidden agent source created by the guided wizard flow.
 *
 * @param options - Collected wizard data.
 * @returns Validated book source ready for the existing create-agent endpoint.
 */
export function createNewAgentWizardSource(options: CreateNewAgentWizardSourceOptions): string_book {
    const agentName = normalizeSingleLine(options.agentName);
    const description = normalizeSingleLine(options.description);
    const personaTraits = options.personaTraits.map(normalizeSingleLine).filter(Boolean);
    const rules = options.rules.map((rule) => spaceTrim(rule)).filter(Boolean);
    const capabilityCommitments = options.capabilityCommitments.filter(
        (commitment): commitment is NewAgentWizardCapabilityCommitment =>
            commitment === 'USE BROWSER' || commitment === 'USE SEARCH ENGINE',
    );
    const knowledgeItems = options.knowledgeItems
        .map((item) => ({
            label: normalizeSingleLine(item.label),
            source: spaceTrim(item.source),
        }))
        .filter((item) => item.label !== '' && item.source !== '');
    const noteLines = [
        'NOTE This agent was created via the NEW_AGENT_WIZZARD flow',
        `- Personality: ${formatSummaryList(personaTraits, 'Default guided persona')}`,
        `- Capabilities: ${formatSummaryList(capabilityCommitments, 'None selected')}`,
        `- Rules: ${formatSummaryList(rules, 'None specified')}`,
        `- Knowledge: ${formatSummaryList(
            knowledgeItems.map((item) => item.label),
            'No knowledge uploaded',
        )}`,
    ];
    const personaDescription =
        personaTraits.length > 0
            ? `You are a ${personaTraits.join(', ')} assistant`
            : 'You are a helpful, concise, and professional assistant';
    const sourceLines = [
        agentName,
        '',
        ...noteLines,
        ...(description ? ['', createCommitment('META DESCRIPTION', description)] : []),
        '',
        createCommitment('PERSONA', personaDescription),
        ...capabilityCommitments.map((commitment) => createCommitment(commitment)),
        ...rules.map((rule) => createCommitment('RULE', rule)),
        ...knowledgeItems.map((item) => createCommitment('KNOWLEDGE', item.source)),
    ];

    return validateBook(sourceLines.join('\n'));
}
