import { spaceTrim } from 'spacetrim';
import { validateBook, type string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { createNewAgentWizardSource, type NewAgentWizardKnowledgeItem } from './createNewAgentWizardSource';

/**
 * Trace label written into agent sources created by the manGo wizard.
 */
const MANGO_WIZARD_TRACE_LABEL = 'NEW_AGENT_WIZARD manGo wizard flow';

/**
 * Default persona fragments folded into the generated `GOAL` commitment.
 */
const MANGO_WIZARD_PERSONA_TRAITS = ['business-focused', 'practical', 'clear with next steps'] as const;

/**
 * Default rules added to manGo wizard sources.
 */
const MANGO_WIZARD_RULES = [
    'Ask a clarifying question when the request is missing business-critical context.',
    'Keep recommendations concrete, actionable, and tied to the available knowledge.',
    'Do not invent facts when the provided knowledge is incomplete.',
] as const;

/**
 * Default writing rules added to manGo wizard sources.
 */
const MANGO_WIZARD_WRITING_RULES = [
    'Use concise business language.',
    'Lead with the practical answer before adding supporting context.',
] as const;

/**
 * Default writing sample added to manGo wizard sources.
 */
const MANGO_WIZARD_WRITING_SAMPLE =
    'Here is the recommended next step, the reason it matters, and the information I would need to continue.';

/**
 * Options used to synthesize a manGo wizard book source.
 */
export type CreateManGoWizardSourceOptions = {
    /**
     * Human-readable agent name.
     */
    readonly agentName: string;

    /**
     * Short description of what the agent should do.
     */
    readonly agentBrief: string;

    /**
     * Ready knowledge items collected by the wizard.
     */
    readonly knowledgeItems: ReadonlyArray<NewAgentWizardKnowledgeItem>;
};

/**
 * Options used to build the final source when the user may have edited the generated book.
 */
export type CreateFinalManGoWizardSourceOptions = CreateManGoWizardSourceOptions & {
    /**
     * Current editable book source.
     */
    readonly bookSource: string;
};

/**
 * Normalizes optional single-line user input.
 *
 * @param value - Raw user input.
 * @returns Trimmed single-line text.
 */
function normalizeSingleLine(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}

/**
 * Returns ready knowledge items with non-empty labels and sources.
 *
 * @param knowledgeItems - Raw wizard knowledge items.
 * @returns Ready knowledge items.
 */
function normalizeKnowledgeItems(
    knowledgeItems: ReadonlyArray<NewAgentWizardKnowledgeItem>,
): Array<NewAgentWizardKnowledgeItem> {
    return knowledgeItems
        .map((item) => ({
            label: normalizeSingleLine(item.label),
            source: spaceTrim(item.source),
        }))
        .filter((item) => item.label !== '' && item.source !== '');
}

/**
 * Returns whether a book source already contains a given knowledge source.
 *
 * @param bookSource - Current book source.
 * @param knowledgeSource - Source URL or content.
 * @returns `true` when the `KNOWLEDGE` commitment already exists.
 */
function hasKnowledgeCommitment(bookSource: string, knowledgeSource: string): boolean {
    const expectedLine = `KNOWLEDGE ${spaceTrim(knowledgeSource)}`;

    return bookSource
        .split(/\r?\n/)
        .map((line) => line.trim())
        .some((line) => line === expectedLine);
}

/**
 * Finds the final `OPEN` or `CLOSED` line so appended knowledge stays before the learning mode.
 *
 * @param lines - Book source lines.
 * @returns Line index or `-1` when no learning-mode commitment is present.
 */
function findLearningModeLineIndex(lines: ReadonlyArray<string>): number {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index]?.trim();
        if (line === 'OPEN' || line === 'CLOSED') {
            return index;
        }
    }

    return -1;
}

/**
 * Appends missing knowledge commitments to an edited book source.
 *
 * @param bookSource - Current book source.
 * @param knowledgeItems - Ready knowledge items.
 * @returns Validated book source with all ready knowledge included.
 */
function appendMissingKnowledgeCommitments(
    bookSource: string,
    knowledgeItems: ReadonlyArray<NewAgentWizardKnowledgeItem>,
): string_book {
    const missingKnowledgeLines = normalizeKnowledgeItems(knowledgeItems)
        .filter((item) => !hasKnowledgeCommitment(bookSource, item.source))
        .map((item) => `KNOWLEDGE ${item.source}`);

    const normalizedBookSource = spaceTrim(bookSource);
    if (missingKnowledgeLines.length === 0) {
        return validateBook(normalizedBookSource);
    }

    const lines = normalizedBookSource.split(/\r?\n/);
    const learningModeLineIndex = findLearningModeLineIndex(lines);
    const nextLines =
        learningModeLineIndex === -1
            ? [...lines, '', ...missingKnowledgeLines]
            : [
                  ...lines.slice(0, learningModeLineIndex),
                  '',
                  ...missingKnowledgeLines,
                  ...lines.slice(learningModeLineIndex),
              ];

    return validateBook(nextLines.join('\n'));
}

/**
 * Builds the initial valid book source for the manGo wizard.
 *
 * @param options - Assignment and knowledge values collected by the wizard.
 * @returns Validated book source.
 */
export function createManGoWizardSource(options: CreateManGoWizardSourceOptions): string_book {
    const agentName = normalizeSingleLine(options.agentName) || 'New Agent';
    const agentBrief = spaceTrim(options.agentBrief);
    const goal =
        agentBrief ||
        `Help users by acting as ${agentName}, a practical assistant configured through the manGo wizard.`;

    return createNewAgentWizardSource({
        agentName,
        description: normalizeSingleLine(agentBrief),
        goal,
        personaTraits: MANGO_WIZARD_PERSONA_TRAITS,
        teamReferences: [],
        isOpenToLearning: false,
        rules: MANGO_WIZARD_RULES,
        capabilityCommitments: [],
        writingStyleTraits: ['business', 'concise'],
        writingRules: MANGO_WIZARD_WRITING_RULES,
        writingSamples: [MANGO_WIZARD_WRITING_SAMPLE],
        knowledgeItems: normalizeKnowledgeItems(options.knowledgeItems),
        traceLabel: MANGO_WIZARD_TRACE_LABEL,
    });
}

/**
 * Builds the final source from either the edited book or a regenerated fallback.
 *
 * @param options - Current wizard state.
 * @returns Validated book source ready for agent creation.
 */
export function createFinalManGoWizardSource(options: CreateFinalManGoWizardSourceOptions): string_book {
    const bookSource = spaceTrim(options.bookSource);
    if (bookSource === '') {
        return createManGoWizardSource(options);
    }

    return appendMissingKnowledgeCommitments(bookSource, options.knowledgeItems);
}
