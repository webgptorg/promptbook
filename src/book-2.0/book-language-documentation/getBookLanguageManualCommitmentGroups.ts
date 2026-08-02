import {
    getCommitmentNoticeMetadata,
    isLowVisibilityCommitmentNotice,
} from '../../commitments/_common/getCommitmentNoticeMetadata';
import { getGroupedCommitmentDefinitions } from '../../commitments/_common/getGroupedCommitmentDefinitions';
import { NotYetImplementedCommitmentDefinition } from '../../commitments/_base/NotYetImplementedCommitmentDefinition';

/**
 * One grouped commitment definition as returned by the runtime registry.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualCommitmentGroup = ReturnType<typeof getGroupedCommitmentDefinitions>[number];

/**
 * Commitment groups of the manual, split by how prominently they are documented.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualCommitmentGroups = {
    /**
     * Commitments documented in the main catalog.
     */
    readonly documented: ReadonlyArray<BookLanguageManualCommitmentGroup>;

    /**
     * Low-level commitments documented in their own closing chapter.
     */
    readonly lowLevel: ReadonlyArray<BookLanguageManualCommitmentGroup>;
};

/**
 * Splits the commitment registry into the groups documented by the manual.
 *
 * Deprecated commitments are intentionally left out completely, so that the
 * manual never teaches a keyword that should no longer be written into a book.
 *
 * @returns Commitment groups for the main catalog and for the low-level chapter.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function getBookLanguageManualCommitmentGroups(): BookLanguageManualCommitmentGroups {
    const documented: Array<BookLanguageManualCommitmentGroup> = [];
    const lowLevel: Array<BookLanguageManualCommitmentGroup> = [];

    for (const groupedCommitment of getGroupedCommitmentDefinitions()) {
        const notice = getCommitmentNoticeMetadata(groupedCommitment.primary);

        if (notice?.kind === 'deprecated') {
            continue;
        }

        if (
            groupedCommitment.primary instanceof NotYetImplementedCommitmentDefinition ||
            groupedCommitment.primary.isUnfinished
        ) {
            continue;
        }

        if (isLowVisibilityCommitmentNotice(notice)) {
            lowLevel.push(groupedCommitment);
            continue;
        }

        documented.push(groupedCommitment);
    }

    return { documented, lowLevel };
}
