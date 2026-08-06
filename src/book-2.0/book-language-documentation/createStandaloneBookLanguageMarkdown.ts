import { spaceTrim } from 'spacetrim';
import { getGroupedCommitmentDefinitions } from '../../commitments/_common/getGroupedCommitmentDefinitions';
import { parseAgentSourceWithCommitments } from '../agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../agent-source/string_book';
import type { string_markdown } from '../../types/string_markdown';
import type { string_language } from '../../types/string_token';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import type { BookLanguageDocumentationExample } from './BookLanguageDocumentationExample';
import { bookLanguageDocumentationExamples } from './bookLanguageDocumentationExamples';
import type { BookLanguageManualDictionary } from './BookLanguageManualDictionary';
import {
    getBookLanguageManualCommitmentGroups,
    type BookLanguageManualCommitmentGroup,
} from './getBookLanguageManualCommitmentGroups';
import { getBookLanguageManualDictionary } from './getBookLanguageManualDictionary';
import { getSafeCodeBlock } from './getSafeCodeBlock';
import { renderCommitmentCatalogSection } from './renderCommitmentCatalogSection';
import { toStableAnchorId } from './toStableAnchorId';

/**
 * Commitment types that primarily model composition of multiple agents.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const COMPOSITION_COMMITMENT_TYPES = new Set(['FROM', 'IMPORT', 'IMPORTS', 'TEAM']);

/**
 * Commitment types that expose tools/runtime capabilities.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const TOOLING_COMMITMENT_TYPES = new Set([
    'USE POPUP',
    'USE USER LOCATION',
    'USE PROJECT',
    'USE CALENDAR',
    'USE IMAGE GENERATOR',
    'USE MCP',
    'USE PRIVACY',
]);

/**
 * Commitment types that primarily define agent profile metadata.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const PROFILE_COMMITMENT_TYPES = new Set([
    'GOAL',
    'GOALS',
    'META AVATAR',
    'META VISUAL',
    'META IMAGE',
    'META LINK',
    'META DOMAIN',
    'META DESCRIPTION',
    'META DISCLAIMER',
    'META FULLNAME',
    'META ID',
    'META INPUT PLACEHOLDER',
    'META THINKING MESSAGE',
    'META VISIBILITY',
    'META COLOR',
    'META FONT',
    'META VOICE',
    'INITIAL MESSAGE',
]);

/**
 * Commitment types that primarily define behavioral constraints or prompt shaping.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const BEHAVIOR_COMMITMENT_TYPES = new Set([
    'RULE',
    'RULES',
    'KNOWLEDGE',
    'GOAL',
    'GOALS',
    'LANGUAGE',
    'LANGUAGES',
    'WRITING SAMPLE',
    'WRITING RULES',
    'SCENARIO',
    'SCENARIOS',
    'MESSAGE',
    'MESSAGES',
    'MESSAGE SUFFIX',
    'USER MESSAGE',
    'AGENT MESSAGE',
    'INTERNAL MESSAGE',
    'OPEN',
    'CLOSED',
]);

/**
 * Agent source incorporated into a server-specific Book language manual.
 *
 * @public exported from `@promptbook/core`
 */
export type BookLanguageDocumentationAgent = {
    /**
     * Human-readable title shown above the baked example.
     */
    readonly agentName: string;
    /**
     * Current Book source used both as an example and to detect used commitments.
     */
    readonly agentSource: string_book;
};

/**
 * Optional context used to tailor a standalone Book language manual.
 *
 * An empty `agents` array deliberately has the same effect as omitting this
 * option, which keeps the non-customized manual portable between servers.
 *
 * @public exported from `@promptbook/core`
 */
export type CreateStandaloneBookLanguageMarkdownOptions = {
    /**
     * Server agents whose sources should be baked into examples and usage priority.
     */
    readonly agents?: ReadonlyArray<BookLanguageDocumentationAgent>;

    /**
     * Language the manual should be written in, English is used as the fallback.
     */
    readonly language?: string_language;

    /**
     * Whether the closing chapter with low-level commitments should be generated.
     *
     * Low-level commitments are intended for advanced use only, so they are
     * omitted unless they are explicitly requested.
     */
    readonly isLowLevelCommitmentsIncluded?: boolean;
};

/**
 * Creates one standalone markdown guide for Book language (Book 2.0 / agent language).
 *
 * The output intentionally combines:
 * - static conceptual building blocks maintained in this repository
 * - dynamically generated commitment catalog from runtime commitment definitions
 * so docs stay up-to-date by design.
 *
 * @returns Full standalone markdown document.
 *
 * @public exported from `@promptbook/core`
 */
export function createStandaloneBookLanguageMarkdown(
    options: CreateStandaloneBookLanguageMarkdownOptions = {},
): string_markdown {
    const dictionary = getBookLanguageManualDictionary(options.language);
    const { documented, lowLevel } = getBookLanguageManualCommitmentGroups();
    const selectedAgents = options.agents?.filter((agent) => agent.agentSource.trim().length > 0) || [];
    const commitmentUsageByType = createCommitmentUsageByType(selectedAgents);
    const isServerSpecificManual = selectedAgents.length > 0;
    const isLowLevelCommitmentsIncluded = options.isLowLevelCommitmentsIncluded === true;
    const catalogCommitments = prioritizeGroupedCommitments(documented, commitmentUsageByType);
    const lowLevelCommitments = isLowLevelCommitmentsIncluded
        ? prioritizeGroupedCommitments(lowLevel, commitmentUsageByType)
        : [];
    const manualCommitments = [...catalogCommitments, ...lowLevelCommitments];
    const generatedAtIso = new Date().toISOString();
    const catalogTitleSuffix = isServerSpecificManual
        ? dictionary.commitmentCatalogTitleSuffixes.usedFirst
        : dictionary.commitmentCatalogTitleSuffixes.all;
    const commitmentSectionAnchorByType = createCommitmentSectionAnchorByType(manualCommitments);

    return spaceTrim(
        // [✨]
        (block) => `
            # ${dictionary.title}

            ${block(dictionary.introLines.map((introLine) => `> ${introLine}  `).join('\n'))}

            - ${dictionary.metadataLabels.bookLanguageVersion}: \`${BOOK_LANGUAGE_VERSION}\`
            - ${dictionary.metadataLabels.generatedAt}: \`${generatedAtIso}\`
            - ${dictionary.metadataLabels.commitmentCount}: \`${manualCommitments.length}\`

            ## <a id="table-of-contents"></a>${dictionary.tableOfContentsTitle}

            - [${dictionary.chapters.whatIs.title}](#what-book-language-is)
            - [${dictionary.chapters.mentalModel.title}](#mental-model-of-an-agent)
            - [${dictionary.chapters.howToStructure.title}](#how-to-structure-good-agents)
            - [${dictionary.chapters.primitives.title}](#primitives-and-constructs-reference)
            - [${dictionary.chapters.commitmentCatalog.title}${catalogTitleSuffix}](#commitment-catalog)
            ${block(renderCommitmentCatalogTableOfContents(catalogCommitments))}
            - [${dictionary.chapters.examples.title}](#end-to-end-examples)
            - [${dictionary.chapters.pitfalls.title}](#do-nots-and-common-pitfalls)
            - [${dictionary.chapters.tutorial.title}](#build-an-agent-from-scratch-offline-tutorial)
            ${block(
                isLowLevelCommitmentsIncluded
                    ? spaceTrim(`
                        - [${dictionary.chapters.lowLevelCommitments.title}](#low-level-commitments)
                        ${renderCommitmentCatalogTableOfContents(lowLevelCommitments)}
                    `)
                    : '',
            )}

            ## <a id="what-book-language-is"></a>${dictionary.chapters.whatIs.title}

            ${block(dictionary.chapters.whatIs.body)}

            ## <a id="mental-model-of-an-agent"></a>${dictionary.chapters.mentalModel.title}

            ${block(dictionary.chapters.mentalModel.body)}

            ${dictionary.mentalModelSections.detectedIntro}

            ${block(renderDetectedCommitmentList(catalogCommitments, dictionary))}

            ### ${dictionary.mentalModelSections.meta.title}

            ${block(dictionary.mentalModelSections.meta.body)}

            ### ${dictionary.mentalModelSections.inheritance.title}

            ${block(dictionary.mentalModelSections.inheritance.body)}

            ### ${dictionary.mentalModelSections.composition.title}

            ${block(dictionary.mentalModelSections.composition.body)}

            ### ${dictionary.mentalModelSections.capabilities.title}

            ${block(dictionary.mentalModelSections.capabilities.body)}

            ## <a id="how-to-structure-good-agents"></a>${dictionary.chapters.howToStructure.title}

            ${block(dictionary.chapters.howToStructure.body)}

            ## <a id="primitives-and-constructs-reference"></a>${dictionary.chapters.primitives.title}

            ### ${dictionary.primitivesSections.coreSyntax.title}

            ${block(dictionary.primitivesSections.coreSyntax.body)}

            ### ${dictionary.primitivesSections.references.title}

            ${block(dictionary.primitivesSections.references.body)}

            ## <a id="commitment-catalog"></a>${dictionary.chapters.commitmentCatalog.title}${catalogTitleSuffix}

            ${block(dictionary.chapters.commitmentCatalog.body)}

            ${block(renderCommitmentCatalogSections(catalogCommitments, dictionary))}

            ## <a id="end-to-end-examples"></a>${dictionary.chapters.examples.title}

            ${block(
                isServerSpecificManual
                    ? selectedAgents
                          .map((agent) =>
                              renderBakedAgentExampleSection(agent, dictionary, commitmentSectionAnchorByType),
                          )
                          .join('\n\n')
                    : bookLanguageDocumentationExamples
                          .map((example) => renderExampleSection(example, dictionary, commitmentSectionAnchorByType))
                          .join('\n\n'),
            )}

            ## <a id="do-nots-and-common-pitfalls"></a>${dictionary.chapters.pitfalls.title}

            ${block(renderPitfallList(dictionary))}

            ## <a id="build-an-agent-from-scratch-offline-tutorial"></a>${dictionary.chapters.tutorial.title}

            ${block(dictionary.chapters.tutorial.body)}

            ${block(
                isServerSpecificManual
                    ? dictionary.tutorialSections.serverAgentsHint
                    : renderCopyPasteTemplate(dictionary),
            )}

            ${dictionary.tutorialSections.checklistTitle}

            ${block(dictionary.tutorialSections.checklistBody)}

            ${block(
                isLowLevelCommitmentsIncluded ? renderLowLevelCommitmentsChapter(lowLevelCommitments, dictionary) : '',
            )}

            ---

            ${dictionary.footer.title}

            ${block(dictionary.footer.body)}
        `,
    );
}

/**
 * Renders the bullet list summarizing which commitment kinds the runtime exposes.
 *
 * @param commitmentGroups - Commitment groups documented in the main catalog.
 * @param dictionary - Translated labels of the manual.
 * @returns Markdown bullet list of detected commitment kinds.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderDetectedCommitmentList(
    commitmentGroups: ReadonlyArray<BookLanguageManualCommitmentGroup>,
    dictionary: BookLanguageManualDictionary,
): string {
    const detectedSections = [
        { label: dictionary.mentalModelSections.detectedProfileLabel, types: PROFILE_COMMITMENT_TYPES },
        { label: dictionary.mentalModelSections.detectedBehaviorLabel, types: BEHAVIOR_COMMITMENT_TYPES },
        { label: dictionary.mentalModelSections.detectedToolingLabel, types: TOOLING_COMMITMENT_TYPES },
        { label: dictionary.mentalModelSections.detectedCompositionLabel, types: COMPOSITION_COMMITMENT_TYPES },
    ];

    return detectedSections
        .map(({ label, types }) => {
            const detectedTypes = commitmentGroups
                .filter(({ primary }) => types.has(primary.type))
                .map(({ primary }) => `\`${primary.type}\``)
                .join(', ');

            return `- ${label}: ${detectedTypes}`;
        })
        .join('\n');
}

/**
 * Renders every commitment section of one catalog chapter.
 *
 * @param commitmentGroups - Commitment groups to render, in final order.
 * @param dictionary - Translated labels of the manual.
 * @returns Markdown sections joined by blank lines.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderCommitmentCatalogSections(
    commitmentGroups: ReadonlyArray<BookLanguageManualCommitmentGroup>,
    dictionary: BookLanguageManualDictionary,
): string {
    return commitmentGroups
        .map((groupedCommitment) =>
            renderCommitmentCatalogSection({
                groupedCommitment,
                dictionary,
            }),
        )
        .join('\n\n');
}

/**
 * Renders the closing chapter documenting low-level commitments.
 *
 * @param commitmentGroups - Low-level commitment groups, in final order.
 * @param dictionary - Translated labels of the manual.
 * @returns Markdown chapter for low-level commitments.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderLowLevelCommitmentsChapter(
    commitmentGroups: ReadonlyArray<BookLanguageManualCommitmentGroup>,
    dictionary: BookLanguageManualDictionary,
): string {
    return spaceTrim(
        (block) => `
            ## <a id="low-level-commitments"></a>${dictionary.chapters.lowLevelCommitments.title}

            ${block(dictionary.chapters.lowLevelCommitments.body)}

            ${block(renderCommitmentCatalogSections(commitmentGroups, dictionary))}
        `,
    );
}

/**
 * Renders links from the manual table of contents to the commitment sections.
 *
 * @param commitmentGroups - Commitment sections included in the manual.
 * @returns Indented markdown links ordered like the catalog.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderCommitmentCatalogTableOfContents(
    commitmentGroups: ReadonlyArray<BookLanguageManualCommitmentGroup>,
): string {
    return commitmentGroups
        .map(
            ({ primary }) =>
                `    - [${primary.icon} \`${primary.type}\`](#commitment-${toStableAnchorId(primary.type)})`,
        )
        .join('\n');
}

/**
 * Maps every recognized spelling of a documented commitment to its stable section anchor.
 *
 * @param commitmentGroups - Commitment sections included in the manual.
 * @returns Canonical anchor id by parsed commitment type.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function createCommitmentSectionAnchorByType(
    commitmentGroups: ReadonlyArray<BookLanguageManualCommitmentGroup>,
): ReadonlyMap<string, string> {
    const anchorByType = new Map<string, string>();

    for (const { primary, aliases } of commitmentGroups) {
        const anchorId = `commitment-${toStableAnchorId(primary.type)}`;
        anchorByType.set(primary.type, anchorId);

        for (const alias of aliases) {
            anchorByType.set(alias, anchorId);
        }
    }

    return anchorByType;
}

/**
 * Renders the "don't vs do" list of common authoring pitfalls.
 *
 * @param dictionary - Translated labels and pitfalls of the manual.
 * @returns Markdown ordered list of pitfalls.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderPitfallList(dictionary: BookLanguageManualDictionary): string {
    return dictionary.pitfalls
        .map((pitfall, index) =>
            spaceTrim(`
                ${index + 1}. **${pitfall.title}**
                - ${dictionary.pitfallLabels.dont}: ${pitfall.dont}
                - ${dictionary.pitfallLabels.doInstead}: ${pitfall.doInstead}
            `),
        )
        .join('\n');
}

/**
 * Renders the copy-paste starting template of the offline tutorial.
 *
 * @param dictionary - Translated labels of the manual.
 * @returns Markdown intro sentence with a Book source template.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderCopyPasteTemplate(dictionary: BookLanguageManualDictionary): string {
    return spaceTrim(
        (block) => `
            ${dictionary.tutorialSections.templateIntro}

            ${block(
                getSafeCodeBlock(
                    spaceTrim(`
                        Project Assistant

                        GOAL Help the user turn project ideas into concrete deliverables with focused planning support.

                        RULE Ask clarifying questions when requirements are ambiguous.
                        RULE Provide concise, structured outputs with actionable steps.
                        RULE If information is missing, state assumptions explicitly.
                        RULE Do not invent facts.

                        KNOWLEDGE Team works in two-week sprints and tracks tasks in Kanban.
                        KNOWLEDGE Preferred output format: summary, plan, risks, next action.

                        META DESCRIPTION Practical project-planning assistant.
                        META INPUT PLACEHOLDER Describe your project goal or blocker...
                        META THINKING MESSAGE Reviewing your project details...

                        INITIAL MESSAGE Share your project goal and current blocker, and I will propose a concrete next-step plan.
                        CLOSED
                    `),
                    'book',
                ),
            )}
        `,
    );
}

/**
 * Counts each selected agent's parsed commitments by their canonical group type.
 *
 * @param agents - Agent sources baked into the manual.
 * @returns Occurrence counts keyed by primary commitment type.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function createCommitmentUsageByType(
    agents: ReadonlyArray<BookLanguageDocumentationAgent>,
): ReadonlyMap<string, number> {
    const primaryTypeByCommitmentType = new Map<string, string>();

    for (const { primary, aliases } of getGroupedCommitmentDefinitions()) {
        primaryTypeByCommitmentType.set(primary.type, primary.type);
        for (const alias of aliases) {
            primaryTypeByCommitmentType.set(alias, primary.type);
        }
    }

    const usageByType = new Map<string, number>();
    for (const agent of agents) {
        for (const commitment of parseAgentSourceWithCommitments(agent.agentSource).commitments) {
            const primaryType = primaryTypeByCommitmentType.get(commitment.type);
            if (primaryType) {
                usageByType.set(primaryType, (usageByType.get(primaryType) || 0) + 1);
            }
        }
    }

    return usageByType;
}

/**
 * Preserves canonical ordering while moving actually used commitment groups first.
 *
 * @param groupedCommitments - Canonically ordered commitment definitions.
 * @param commitmentUsageByType - Selected-agent occurrence counts by primary type.
 * @returns Commitment groups sorted by selected-agent usage, then canonical order.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function prioritizeGroupedCommitments(
    groupedCommitments: ReadonlyArray<BookLanguageManualCommitmentGroup>,
    commitmentUsageByType: ReadonlyMap<string, number>,
): ReadonlyArray<BookLanguageManualCommitmentGroup> {
    return groupedCommitments
        .map((groupedCommitment, index) => ({
            groupedCommitment,
            index,
            usageCount: commitmentUsageByType.get(groupedCommitment.primary.type) || 0,
        }))
        .sort((first, second) => second.usageCount - first.usageCount || first.index - second.index)
        .map(({ groupedCommitment }) => groupedCommitment);
}

/**
 * Renders a real selected server agent as the manual's practical example.
 *
 * @param agent - Agent source selected for the manual.
 * @param dictionary - Translated labels of the manual.
 * @returns Markdown section for one baked agent example.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderBakedAgentExampleSection(
    agent: BookLanguageDocumentationAgent,
    dictionary: BookLanguageManualDictionary,
    commitmentSectionAnchorByType: ReadonlyMap<string, string>,
): string {
    const usedCommitmentTypes = Array.from(
        new Set(parseAgentSourceWithCommitments(agent.agentSource).commitments.map((commitment) => commitment.type)),
    );
    const usedCommitmentsMarkdown = renderCommitmentSectionLinks(usedCommitmentTypes, commitmentSectionAnchorByType);

    return spaceTrim(
        (block) => `
            ### <a id="example-${toStableAnchorId(agent.agentName)}"></a>${agent.agentName}

            **${dictionary.exampleLabels.commitmentsUsed}:** ${
            usedCommitmentsMarkdown || dictionary.exampleLabels.noCommitments
        }

            **${dictionary.exampleLabels.fullSource}**

            ${block(getSafeCodeBlock(agent.agentSource, 'book'))}
        `,
    );
}

/**
 * Renders one end-to-end example section.
 *
 * @param example - Example definition.
 * @param dictionary - Translated labels and example prose of the manual.
 * @returns Markdown section for one example.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderExampleSection(
    example: BookLanguageDocumentationExample,
    dictionary: BookLanguageManualDictionary,
    commitmentSectionAnchorByType: ReadonlyMap<string, string>,
): string {
    const exampleText = dictionary.exampleTexts[example.id];

    if (exampleText === undefined) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ### <a id="example-${toStableAnchorId(example.id)}"></a>${exampleText.title}

            **${dictionary.exampleLabels.goal}:** ${exampleText.goal}

            **${dictionary.exampleLabels.commitmentsUsed}:** ${renderCommitmentSectionLinks(
            parseAgentSourceWithCommitments(example.source as string_book).commitments.map(
                (commitment) => commitment.type,
            ),
            commitmentSectionAnchorByType,
        )}

            **${dictionary.exampleLabels.fullSource}**

            ${block(getSafeCodeBlock(example.source, 'book'))}

            **${dictionary.exampleLabels.walkthrough}**

            ${block(exampleText.walkthrough.map((step, index) => `${index + 1}. ${step}`).join('\n'))}
        `,
    );
}

/**
 * Renders unique commitment links used by an end-to-end example.
 *
 * @param commitmentTypes - Commitment types in their source order.
 * @param commitmentSectionAnchorByType - Documented commitment anchors by parsed type.
 * @returns Comma-separated markdown links, or an empty string when none are documented.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderCommitmentSectionLinks(
    commitmentTypes: ReadonlyArray<string>,
    commitmentSectionAnchorByType: ReadonlyMap<string, string>,
): string {
    return Array.from(new Set(commitmentTypes))
        .flatMap((type) => {
            const anchorId = commitmentSectionAnchorByType.get(type);
            return anchorId ? [`[\`${type}\`](#${anchorId})`] : [];
        })
        .join(', ');
}
