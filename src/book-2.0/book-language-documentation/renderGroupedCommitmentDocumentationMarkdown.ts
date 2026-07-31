import { spaceTrim } from 'spacetrim';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';
import type { string_markdown } from '../../types/string_markdown';
import { shiftMarkdownHeadingLevels } from '../../utils/markdown/shiftMarkdownHeadingLevels';

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
 * @param headingLevelShift - How many levels the whole entry is nested by its host document.
 * @returns Markdown subsection introducing one commitment of the family.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
function renderDocumentationSection(title: string, documentation: string, headingLevelShift: number): string {
    const headingPrefix = '#'.repeat(COMMITMENT_DOCUMENTATION_SECTION_HEADING_LEVEL + headingLevelShift);

    return spaceTrim(
        (block) => `
            ${headingPrefix} ${title}

            ${block(
                shiftMarkdownHeadingLevels(
                    removeLeadingTopLevelHeading(documentation) as string_markdown,
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

    if (commitmentTypes.has(OPEN_COMMITMENT_TYPE) && commitmentTypes.has(CLOSED_COMMITMENT_TYPE)) {
        const openCommitmentDefinition = getCommitmentDefinition(OPEN_COMMITMENT_TYPE);
        const closedCommitmentDefinition = getCommitmentDefinition(CLOSED_COMMITMENT_TYPE);

        if (openCommitmentDefinition && closedCommitmentDefinition) {
            return spaceTrim(
                (block) => `
                    ${block(
                        renderDocumentationSection(
                            OPEN_COMMITMENT_TYPE,
                            openCommitmentDefinition.documentation,
                            headingLevelShift,
                        ),
                    )}

                    ${block(
                        renderDocumentationSection(
                            CLOSED_COMMITMENT_TYPE,
                            closedCommitmentDefinition.documentation,
                            headingLevelShift,
                        ),
                    )}
                `,
            );
        }
    }

    return shiftMarkdownHeadingLevels(
        removeLeadingTopLevelHeading(group.primary.documentation) as string_markdown,
        headingLevelShift,
    );
}
