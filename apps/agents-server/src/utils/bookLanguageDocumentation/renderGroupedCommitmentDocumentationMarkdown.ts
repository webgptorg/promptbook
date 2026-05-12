import { spaceTrim } from 'spacetrim';
import { getCommitmentDefinition } from '../../../../../src/commitments/_common/getCommitmentDefinition';

/**
 * Minimal commitment shape used by documentation renderers.
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
 */
const OPEN_COMMITMENT_TYPE = 'OPEN';

/**
 * Canonical commitment keyword for the open/closed family.
 */
const CLOSED_COMMITMENT_TYPE = 'CLOSED';

/**
 * Removes the top-level heading from one commitment documentation block.
 *
 * @param markdown - Original markdown source.
 * @returns Markdown without the first `#` heading.
 */
function removeLeadingTopLevelHeading(markdown: string): string {
    return markdown.replace(/^\s*#\s+[^\n]+\n*/u, '').trim();
}

/**
 * Renders one subsection for the combined open/closed documentation family.
 *
 * @param title - Heading label for the subsection.
 * @param documentation - Raw commitment documentation markdown.
 * @returns Markdown subsection with a `####` heading.
 */
function renderDocumentationSection(title: string, documentation: string): string {
    return `#### ${title}\n\n${removeLeadingTopLevelHeading(documentation)}`;
}

/**
 * Renders the documentation body for one grouped commitment entry.
 *
 * `OPEN` and `CLOSED` are intentionally rendered together so the documentation
 * surfaces present them as one conceptual switch instead of two isolated pages.
 *
 * @param group - Grouped commitment metadata.
 * @returns Markdown body for the docs page/catalog entry.
 */
export function renderGroupedCommitmentDocumentationMarkdown(group: GroupedCommitmentDocumentationSource): string {
    const commitmentTypes = new Set([group.primary.type, ...group.aliases]);

    if (commitmentTypes.has(OPEN_COMMITMENT_TYPE) && commitmentTypes.has(CLOSED_COMMITMENT_TYPE)) {
        const openCommitmentDefinition = getCommitmentDefinition(OPEN_COMMITMENT_TYPE);
        const closedCommitmentDefinition = getCommitmentDefinition(CLOSED_COMMITMENT_TYPE);

        if (openCommitmentDefinition && closedCommitmentDefinition) {
            return spaceTrim(
                (block) => `
                    ${block(renderDocumentationSection(OPEN_COMMITMENT_TYPE, openCommitmentDefinition.documentation))}

                    ${block(
                        renderDocumentationSection(CLOSED_COMMITMENT_TYPE, closedCommitmentDefinition.documentation),
                    )}
                `,
            );
        }
    }

    return removeLeadingTopLevelHeading(group.primary.documentation);
}
