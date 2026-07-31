import { spaceTrim } from 'spacetrim';
import { NotYetImplementedCommitmentDefinition } from '../../commitments/_base/NotYetImplementedCommitmentDefinition';
import {
    formatCommitmentReplacementText,
    getCommitmentNoticeMetadata,
} from '../../commitments/_common/getCommitmentNoticeMetadata';
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
     * Number of uses across the selected server agents.
     */
    readonly usageCount: number;

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
    const { groupedCommitment, usageCount, dictionary } = options;
    const { primary, aliases } = groupedCommitment;
    const labels = dictionary.commitmentLabels;
    const notice = getCommitmentNoticeMetadata(primary);
    const status =
        primary instanceof NotYetImplementedCommitmentDefinition
            ? labels.statusPlaceholder
            : notice
            ? `${labels.statusImplemented} (${notice.detailLabel})`
            : labels.statusImplemented;
    const aliasText = aliases.length === 0 ? labels.noAliases : aliases.map((alias) => `\`${alias}\``).join(', ');
    const noticeText = notice
        ? notice.kind === 'deprecated'
            ? `- **${notice.detailLabel}:** ${notice.message}${formatCommitmentReplacementText(
                  primary.deprecation?.replacedBy,
              )}`
            : `- **${labels.lowLevelNotice}:** ${notice.message}`
        : '';
    const usageMarkdown =
        usageCount > 0
            ? `- **${labels.usage}:** ${usageCount} ${
                  usageCount === 1 ? labels.usageOccurrence : labels.usageOccurrences
              }`
            : '';

    return spaceTrim(
        (block) => `
            ### <a id="commitment-${toStableAnchorId(primary.type)}"></a>${primary.icon} ${primary.type}

            - **${labels.status}:** ${status}
            - **${labels.aliases}:** ${aliasText}
            - **${labels.semantics}:** ${primary.description}
            - **${labels.typeSchema} (\`createTypeRegex\`):** \`${stringifyRegex(primary.createTypeRegex())}\`
            - **${labels.blockSchema} (\`createRegex\`):** \`${stringifyRegex(primary.createRegex())}\`
            ${noticeText}
            ${usageMarkdown}

            ${block(
                renderGroupedCommitmentDocumentationMarkdown(
                    groupedCommitment,
                    COMMITMENT_CATALOG_HEADING_LEVEL_SHIFT,
                ),
            )}
        `,
    );
}

/**
 * Converts a regular expression into a concise literal-like string.
 *
 * @param regex - Regex instance.
 * @returns Printable regex pattern and flags.
 *
 * @private internal utility of `renderCommitmentCatalogSection`
 */
function stringifyRegex(regex: RegExp): string {
    return `/${regex.source}/${regex.flags}`;
}
