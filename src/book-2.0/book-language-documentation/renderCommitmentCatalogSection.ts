import { spaceTrim } from 'spacetrim';
import type { BookLanguageManualDictionary } from './BookLanguageManualDictionary';
import type { BookLanguageManualCommitmentGroup } from './getBookLanguageManualCommitmentGroups';
import { renderGroupedCommitmentDocumentationMarkdown } from './renderGroupedCommitmentDocumentationMarkdown';
import { toStableAnchorId } from './toStableAnchorId';

/**
 * How deep one commitment documentation body is nested inside the catalog.
 *
 * A catalog entry is a `###` heading, therefore the `##` sections of the
 * commitment documentation have to become `####` sections.
 *
 * @private internal constant of `renderCommitmentCatalogSection`
 */
const COMMITMENT_CATALOG_HEADING_LEVEL_SHIFT = 2;

/**
 * Options for rendering one commitment section of the generated catalog.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type RenderCommitmentCatalogSectionOptions = {
    /**
     * Grouped commitment definition with aliases.
     */
    readonly groupedCommitment: BookLanguageManualCommitmentGroup;

    /**
     * Translated labels of the manual.
     */
    readonly dictionary: BookLanguageManualDictionary;
};

/**
 * Renders one commitment section in the generated catalog.
 *
 * @param options - Commitment group, usage statistics, and translated labels.
 * @returns Markdown section for a single commitment.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function renderCommitmentCatalogSection(options: RenderCommitmentCatalogSectionOptions): string {
    const { groupedCommitment, dictionary } = options;
    const { primary, aliases } = groupedCommitment;
    const labels = dictionary.commitmentLabels;
    const aliasesMarkdown =
        aliases.length === 0 ? '' : `- **${labels.aliases}:** ${aliases.map((alias) => `\`${alias}\``).join(', ')}`;

    return spaceTrim(
        (block) => `
            ### <a id="commitment-${toStableAnchorId(primary.type)}"></a>${primary.icon} ${primary.type}

            ${aliasesMarkdown}

            ${block(
                renderGroupedCommitmentDocumentationMarkdown(
                    groupedCommitment,
                    COMMITMENT_CATALOG_HEADING_LEVEL_SHIFT,
                ),
            )}
        `,
    );
}
