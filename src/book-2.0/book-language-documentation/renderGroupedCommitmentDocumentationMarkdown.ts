import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from '../agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../agent-source/string_book';
import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import { getAllCommitmentTypes } from '../../commitments/_common/getAllCommitmentTypes';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';
import type { string_markdown } from '../../types/string_markdown';
import { shiftMarkdownHeadingLevels } from '../../utils/markdown/shiftMarkdownHeadingLevels';
import { getSafeCodeBlock } from './getSafeCodeBlock';

/**
 * Minimal commitment shape used by documentation renderers.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
type CommitmentDocumentationSource = {
    /**
     * Canonical commitment keyword.
     */
    readonly type: string;

    /**
     * Full markdown documentation block, including the top-level heading.
     */
    readonly documentation: string;
};

/**
 * Grouped commitment metadata consumed by the docs renderer.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
type GroupedCommitmentDocumentationSource = {
    /**
     * Primary commitment shown in the docs entry.
     */
    readonly primary: CommitmentDocumentationSource;

    /**
     * Aliases grouped under the same docs entry.
     */
    readonly aliases: ReadonlyArray<string>;
};

/**
 * Canonical commitment keyword for the open/closed family.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const OPEN_COMMITMENT_TYPE = 'OPEN';

/**
 * Canonical commitment keyword for the open/closed family.
 */
const CLOSED_COMMITMENT_TYPE = 'CLOSED';

/**
 * Heading level of the sections a commitment documentation body starts with.
 *
 * Every commitment body opens with `# TYPE` followed by `##` sections, so a
 * family subsection heading has to sit exactly one level above those sections.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const COMMITMENT_DOCUMENTATION_SECTION_HEADING_LEVEL = 2;

/**
 * Markdown code blocks whose Book source is shown as a commitment example.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const BOOK_CODE_BLOCK_PATTERN = /(`{3,})book[^\n]*\n([\s\S]*?)\n\1/gu;

/**
 * Recognized commitment types, ordered so compound keywords take priority over
 * their shorter prefixes when reducing an example line by line.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
const COMMITMENT_TYPES_BY_LENGTH = [...getAllCommitmentTypes()].sort(
    (firstType, secondType) => secondType.length - firstType.length,
);

/**
 * Removes the top-level heading from one commitment documentation block.
 *
 * @param markdown - Original markdown source.
 * @returns Markdown without the first `#` heading.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function removeLeadingTopLevelHeading(markdown: string): string {
    return markdown.replace(/^\s*#\s+[^\n]+\n*/u, '').trim();
}

/**
 * Renders one subsection for the combined open/closed documentation family.
 *
 * @param title - Heading label for the subsection.
 * @param documentation - Raw commitment documentation markdown.
 * @param group - Commitment family represented by the documentation entry.
 * @param headingLevelShift - How many levels the whole entry is nested by its host document.
 * @returns Markdown subsection introducing one commitment of the family.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderDocumentationSection(
    title: string,
    documentation: string,
    group: GroupedCommitmentDocumentationSource,
    headingLevelShift: number,
): string {
    const headingPrefix = '#'.repeat(COMMITMENT_DOCUMENTATION_SECTION_HEADING_LEVEL + headingLevelShift);

    return spaceTrim(
        (block) => `
            ${headingPrefix} ${title}

            ${block(
                shiftMarkdownHeadingLevels(
                    removeLeadingTopLevelHeading(
                        renderFocusedCommitmentExamples(documentation, group),
                    ) as string_markdown,
                    headingLevelShift + 1,
                ),
            )}
        `,
    );
}

/**
 * Renders the documentation body for one grouped commitment entry.
 *
 * `OPEN` and `CLOSED` are intentionally rendered together so the documentation
 * surfaces present them as one conceptual switch instead of two isolated pages.
 *
 * @param group - Grouped commitment metadata.
 * @param headingLevelShift - How many levels the entry is nested by its host document.
 * @returns Markdown body for the docs page/catalog entry.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function renderGroupedCommitmentDocumentationMarkdown(
    group: GroupedCommitmentDocumentationSource,
    headingLevelShift = 0,
): string {
    const commitmentTypes = new Set([group.primary.type, ...group.aliases]);

    const isOpenClosedCommitmentFamily =
        commitmentTypes.has(OPEN_COMMITMENT_TYPE) && commitmentTypes.has(CLOSED_COMMITMENT_TYPE);

    if (isOpenClosedCommitmentFamily) {
        const openCommitmentDefinition = getCommitmentDefinition(OPEN_COMMITMENT_TYPE);
        const closedCommitmentDefinition = getCommitmentDefinition(CLOSED_COMMITMENT_TYPE);

        if (openCommitmentDefinition && closedCommitmentDefinition) {
            return spaceTrim(
                (block) => `
                    ${block(
                        renderDocumentationSection(
                            OPEN_COMMITMENT_TYPE,
                            openCommitmentDefinition.documentation,
                            group,
                            headingLevelShift,
                        ),
                    )}

                    ${block(
                        renderDocumentationSection(
                            CLOSED_COMMITMENT_TYPE,
                            closedCommitmentDefinition.documentation,
                            group,
                            headingLevelShift,
                        ),
                    )}
                `,
            );
        }
    }

    return shiftMarkdownHeadingLevels(
        removeLeadingTopLevelHeading(
            renderFocusedCommitmentExamples(group.primary.documentation, group),
        ) as string_markdown,
        headingLevelShift,
    );
}

/**
 * Rewrites Book examples in commitment documentation to show one canonical
 * commitment in isolation, with only `GOAL` and `CLOSED` as supporting syntax.
 *
 * @param documentation - Raw commitment documentation markdown.
 * @param group - Commitment family represented by the documentation entry.
 * @returns Documentation whose Book examples use focused canonical syntax.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderFocusedCommitmentExamples(documentation: string, group: GroupedCommitmentDocumentationSource): string {
    return documentation.replace(BOOK_CODE_BLOCK_PATTERN, (codeBlock, _fence, source: string) => {
        const focusedSource = createFocusedCommitmentExampleSource(source, group);
        return focusedSource ? getSafeCodeBlock(focusedSource, 'book') : codeBlock;
    });
}

/**
 * Creates a focused Book source example for one commitment documentation entry.
 *
 * @param source - Original Book source from the commitment documentation.
 * @param group - Commitment family represented by the documentation entry.
 * @returns Focused source, or `null` when the source cannot be safely reduced.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function createFocusedCommitmentExampleSource(
    source: string,
    group: GroupedCommitmentDocumentationSource,
): string | null {
    const parsedSource = parseAgentSourceWithCommitments(source as string_book);
    const commitmentTypes = new Set([group.primary.type, ...group.aliases]);
    const isOpenClosedCommitmentFamily =
        commitmentTypes.has(OPEN_COMMITMENT_TYPE) && commitmentTypes.has(CLOSED_COMMITMENT_TYPE);
    const allowedCommitmentTypes = new Set([group.primary.type, ...group.aliases, 'GOAL', CLOSED_COMMITMENT_TYPE]);
    const canonicalTypeByCommitmentType = createCanonicalCommitmentTypeByCommitmentType(
        group,
        isOpenClosedCommitmentFamily,
    );
    const focusedCommitments = parsedSource.commitments
        .filter((commitment) => allowedCommitmentTypes.has(commitment.type))
        .map((commitment) => {
            const type = canonicalTypeByCommitmentType.get(commitment.type) || commitment.type;
            return `${type}${commitment.content ? ` ${commitment.content}` : ''}`;
        });

    if (focusedCommitments.length > 0) {
        return finalizeFocusedCommitmentExampleSource(
            getFocusedExampleAgentName(parsedSource.agentName),
            focusedCommitments,
        );
    }

    return createLineFocusedCommitmentExampleSource(source, group, isOpenClosedCommitmentFamily);
}

/**
 * Creates a focused example when the Book parser cannot recognize the target
 * commitment because it appears as the first source line or has a shared prefix.
 *
 * @param source - Original Book source from the documentation code block.
 * @param group - Commitment family represented by the documentation entry.
 * @param isOpenClosedCommitmentFamily - Whether the family contains both switch commitments.
 * @returns Focused source, or `null` when the source does not use this commitment family.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function createLineFocusedCommitmentExampleSource(
    source: string,
    group: GroupedCommitmentDocumentationSource,
    isOpenClosedCommitmentFamily: boolean,
): string | null {
    const sourceLines = source.split(/\r?\n/u);
    const allowedCommitmentTypes = new Set([group.primary.type, ...group.aliases, 'GOAL', CLOSED_COMMITMENT_TYPE]);
    const canonicalTypeByCommitmentType = createCanonicalCommitmentTypeByCommitmentType(
        group,
        isOpenClosedCommitmentFamily,
    );
    const focusedCommitments: Array<string> = [];
    const firstSourceLine = sourceLines.find((line) => line.trim().length > 0) || null;
    const firstCommitmentType = firstSourceLine ? getCommitmentTypeAtLine(firstSourceLine) : null;
    const agentName = firstSourceLine && !firstCommitmentType ? firstSourceLine.trim() : null;
    let activeFocusedCommitmentIndex: number | null = null;
    let isInsideCodeBlock = false;

    for (const sourceLine of sourceLines) {
        const trimmedSourceLine = sourceLine.trim();

        if (trimmedSourceLine.startsWith('```')) {
            appendLineToActiveCommitment(focusedCommitments, activeFocusedCommitmentIndex, sourceLine);
            isInsideCodeBlock = !isInsideCodeBlock;
            continue;
        }

        if (isInsideCodeBlock) {
            appendLineToActiveCommitment(focusedCommitments, activeFocusedCommitmentIndex, sourceLine);
            continue;
        }

        const commitmentType = getCommitmentTypeAtLine(sourceLine);

        if (!commitmentType) {
            appendLineToActiveCommitment(focusedCommitments, activeFocusedCommitmentIndex, sourceLine);
            continue;
        }

        if (!allowedCommitmentTypes.has(commitmentType)) {
            activeFocusedCommitmentIndex = null;
            continue;
        }

        const canonicalType = canonicalTypeByCommitmentType.get(commitmentType) || commitmentType;
        const content = trimmedSourceLine.slice(commitmentType.length).trimStart();
        focusedCommitments.push(`${canonicalType}${content ? ` ${content}` : ''}`);
        activeFocusedCommitmentIndex = focusedCommitments.length - 1;
    }

    return finalizeFocusedCommitmentExampleSource(agentName, focusedCommitments);
}

/**
 * Finds the longest supported commitment keyword at the start of a source line.
 *
 * @param sourceLine - One Book source line to inspect.
 * @returns Matching commitment type, or `null` when the line is ordinary content.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function getCommitmentTypeAtLine(sourceLine: string): BookCommitment | null {
    const trimmedSourceLine = sourceLine.trim();

    return (
        COMMITMENT_TYPES_BY_LENGTH.find(
            (commitmentType) =>
                trimmedSourceLine === commitmentType || trimmedSourceLine.startsWith(`${commitmentType} `),
        ) || null
    );
}

/**
 * Appends a source line only when a focused commitment currently owns it.
 *
 * @param focusedCommitments - Focused commitments assembled from the example.
 * @param activeFocusedCommitmentIndex - Index of the commitment receiving continuation lines.
 * @param sourceLine - Source line to append.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function appendLineToActiveCommitment(
    focusedCommitments: Array<string>,
    activeFocusedCommitmentIndex: number | null,
    sourceLine: string,
): void {
    if (activeFocusedCommitmentIndex === null) {
        return;
    }

    focusedCommitments[activeFocusedCommitmentIndex] += `\n${sourceLine}`;
}

/**
 * Adds the standard closing marker and formats one reduced Book example.
 *
 * @param agentName - Optional human-readable title retained from the original example.
 * @param focusedCommitments - Canonical commitment blocks kept in the example.
 * @returns Focused source, or `null` when no relevant commitment was found.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function finalizeFocusedCommitmentExampleSource(
    agentName: string | null,
    focusedCommitments: Array<string>,
): string | null {
    const normalizedFocusedCommitments = focusedCommitments.map((commitment) => commitment.trim());

    if (normalizedFocusedCommitments.length === 0) {
        return null;
    }

    const isClosedCommitmentIncluded = normalizedFocusedCommitments.some((commitment) =>
        commitment.startsWith(CLOSED_COMMITMENT_TYPE),
    );
    const isOpenCommitmentIncluded = normalizedFocusedCommitments.some((commitment) =>
        commitment.startsWith(OPEN_COMMITMENT_TYPE),
    );

    if (!isClosedCommitmentIncluded && !isOpenCommitmentIncluded) {
        normalizedFocusedCommitments.push(CLOSED_COMMITMENT_TYPE);
    }

    return [agentName, ...normalizedFocusedCommitments].filter((line): line is string => Boolean(line)).join('\n\n');
}

/**
 * Keeps an example title unless the parser interpreted a commitment-only
 * example's first line as its mandatory agent name.
 *
 * @param agentName - Parsed agent name from the original example.
 * @returns Agent title suitable for a focused example, or `null` when absent.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function getFocusedExampleAgentName(agentName: string | null): string | null {
    if (!agentName || getCommitmentDefinition(agentName as BookCommitment)) {
        return null;
    }

    return agentName;
}

/**
 * Maps aliases to the canonical keyword shown by a commitment example.
 *
 * `OPEN` and `CLOSED` share one documentation entry, but each remains a
 * distinct keyword and must therefore retain its own spelling.
 *
 * @param group - Commitment family represented by the documentation entry.
 * @param isOpenClosedCommitmentFamily - Whether the family contains both switch commitments.
 * @returns Canonical keyword by accepted source keyword.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function createCanonicalCommitmentTypeByCommitmentType(
    group: GroupedCommitmentDocumentationSource,
    isOpenClosedCommitmentFamily: boolean,
): ReadonlyMap<string, string> {
    const canonicalTypeByCommitmentType = new Map<string, string>();

    canonicalTypeByCommitmentType.set(group.primary.type, group.primary.type);

    for (const alias of group.aliases) {
        canonicalTypeByCommitmentType.set(alias, isOpenClosedCommitmentFamily ? alias : group.primary.type);
    }

    return canonicalTypeByCommitmentType;
}
