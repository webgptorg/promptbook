import { spaceTrim } from 'spacetrim';
import { validateBook, type string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import {
    NEW_AGENT_WIZARD_KNOWN_CAPABILITY_COMMITMENTS,
    type NewAgentWizardCapabilityCommitment,
} from './newAgentWizardPresets';
import { summarizeTeamReference } from './NewAgentWizardState';

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
 * Capability commitment keywords supported by the wizard source builder.
 */
export type { NewAgentWizardCapabilityCommitment } from './newAgentWizardPresets';

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
     * Optional agent goal written into one `GOAL` commitment.
     */
    readonly goal?: string;
    /**
     * Persona fragments selected from the preset chips.
     */
    readonly personaTraits: ReadonlyArray<string>;
    /**
     * TEAM compact references or absolute agent URLs.
     */
    readonly teamReferences: ReadonlyArray<string>;
    /**
     * Whether the agent should remain open to conversational self-modification.
     */
    readonly isOpenToLearning: boolean;
    /**
     * Rule commitments collected from default toggles.
     */
    readonly rules: ReadonlyArray<string>;
    /**
     * Tool capability commitments selected in the wizard.
     */
    readonly capabilityCommitments: ReadonlyArray<NewAgentWizardCapabilityCommitment>;
    /**
     * `STYLE` commitments synthesized from writing-style presets and custom traits.
     */
    readonly writingStyleTraits: ReadonlyArray<string>;
    /**
     * `WRITING RULES` commitments synthesized from writing-style presets and custom inputs.
     */
    readonly writingRules: ReadonlyArray<string>;
    /**
     * `WRITING SAMPLE` commitments synthesized from writing-style presets and custom inputs.
     */
    readonly writingSamples: ReadonlyArray<string>;
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
 * Builds repeated commitment lines from a keyword and content list.
 *
 * @param keyword - Commitment keyword.
 * @param items - Raw commitment contents.
 * @returns Formatted commitment lines.
 */
function createCommitmentLines(keyword: string, items: ReadonlyArray<string>): Array<string> {
    return items.map((item) => createCommitment(keyword, item)).filter(Boolean);
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
    const goal = spaceTrim(options.goal || '');
    const summarizedGoal = normalizeSingleLine(goal);
    const personaTraits = options.personaTraits.map(normalizeSingleLine).filter(Boolean);
    const teamReferences = options.teamReferences.map((teamReference) => spaceTrim(teamReference)).filter(Boolean);
    const rules = options.rules.map((rule) => spaceTrim(rule)).filter(Boolean);
    const capabilityCommitments = options.capabilityCommitments.filter(
        (commitment): commitment is NewAgentWizardCapabilityCommitment =>
            NEW_AGENT_WIZARD_KNOWN_CAPABILITY_COMMITMENTS.has(commitment),
    );
    const writingStyleTraits = options.writingStyleTraits.map(normalizeSingleLine).filter(Boolean);
    const writingRules = options.writingRules.map((rule) => spaceTrim(rule)).filter(Boolean);
    const writingSamples = options.writingSamples.map((sample) => spaceTrim(sample)).filter(Boolean);
    const knowledgeItems = options.knowledgeItems
        .map((item) => ({
            label: normalizeSingleLine(item.label),
            source: spaceTrim(item.source),
        }))
        .filter((item) => item.label !== '' && item.source !== '');
    const noteLines = [
        'NOTE This agent was created via the NEW_AGENT_WIZZARD flow',
        `- Goal: ${summarizedGoal || 'No explicit goal'}`,
        `- Personality: ${formatSummaryList(personaTraits, 'Default guided persona')}`,
        `- Learning: ${options.isOpenToLearning ? 'Open to learning' : 'Fixed after creation'}`,
        `- Capabilities: ${formatSummaryList(capabilityCommitments, 'None selected')}`,
        `- Team: ${formatSummaryList(teamReferences.map(summarizeTeamReference).filter(Boolean), 'No teammates')}`,
        `- Writing style: ${formatSummaryList(writingStyleTraits, 'Default guided writing style')}`,
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
        ...(goal ? [createCommitment('GOAL', goal)] : []),
        ...capabilityCommitments.map((commitment) => createCommitment(commitment)),
        ...createCommitmentLines('TEAM', teamReferences),
        ...createCommitmentLines('STYLE', writingStyleTraits),
        ...createCommitmentLines('WRITING RULES', writingRules),
        ...createCommitmentLines('WRITING SAMPLE', writingSamples),
        ...rules.map((rule) => createCommitment('RULE', rule)),
        ...knowledgeItems.map((item) => createCommitment('KNOWLEDGE', item.source)),
        options.isOpenToLearning ? 'OPEN' : 'CLOSED',
    ].flat();

    return validateBook(sourceLines.join('\n'));
}
