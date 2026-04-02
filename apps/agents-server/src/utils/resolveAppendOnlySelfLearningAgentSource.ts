import { padBook } from '../../../../src/book-2.0/agent-source/padBook';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';

/**
 * Inputs required to persist one self-learning update without rewriting inherited source snapshots.
 */
type ResolveAppendOnlySelfLearningAgentSourceOptions = {
    /**
     * Editable child source currently stored in the database.
     */
    readonly unresolvedAgentSourceBeforeLearning: string_book;
    /**
     * Effective resolved source used during runtime before self-learning started.
     */
    readonly resolvedAgentSourceBeforeLearning: string_book;
    /**
     * Effective resolved source after self-learning finished in memory.
     */
    readonly resolvedAgentSourceAfterLearning: string_book;
};

/**
 * Normalizes one book string for append-delta and idempotency comparisons.
 *
 * @param source - Raw book text to normalize.
 * @returns Comparable normalized text.
 */
function normalizeBookForComparison(source: string): string {
    return spaceTrim(source).replace(/\r\n/g, '\n');
}

/**
 * Extracts only the suffix appended during self-learning from the resolved runtime source.
 *
 * Returns `null` when no new suffix exists or when the change is not append-only.
 *
 * @param sourceBeforeLearning - Effective source used before learning.
 * @param sourceAfterLearning - Effective source after learning.
 * @returns Newly appended section, or `null` when unsafe/unavailable.
 */
function extractResolvedSelfLearningAppendedSection(
    sourceBeforeLearning: string_book,
    sourceAfterLearning: string_book,
): string | null {
    const normalizedBefore = normalizeBookForComparison(sourceBeforeLearning);
    const normalizedAfter = normalizeBookForComparison(sourceAfterLearning);

    if (normalizedBefore === normalizedAfter) {
        return null;
    }

    if (!normalizedAfter.startsWith(normalizedBefore)) {
        return null;
    }

    const appendedSection = spaceTrim(normalizedAfter.slice(normalizedBefore.length));
    return appendedSection.length > 0 ? appendedSection : null;
}

/**
 * Produces the next stored child source using append-only semantics.
 *
 * The function derives only the newly appended part from resolved runtime sources, then appends that part
 * onto the unresolved child source. Parent/inherited source materialized in the resolved runtime source
 * is intentionally never copied into stored child source.
 *
 * Returns `null` when there is nothing new to persist, when the update is non-append-only,
 * or when the appended section is already present in the unresolved child source.
 *
 * @param options - Persistence inputs from one self-learning run.
 * @returns Next unresolved child source to store, or `null` when no safe write should occur.
 */
export function resolveAppendOnlySelfLearningAgentSource(
    options: ResolveAppendOnlySelfLearningAgentSourceOptions,
): string_book | null {
    const appendedSection = extractResolvedSelfLearningAppendedSection(
        options.resolvedAgentSourceBeforeLearning,
        options.resolvedAgentSourceAfterLearning,
    );

    if (!appendedSection) {
        return null;
    }

    const normalizedUnresolvedSource = normalizeBookForComparison(options.unresolvedAgentSourceBeforeLearning);
    const normalizedAppendedSection = normalizeBookForComparison(appendedSection);

    if (!normalizedAppendedSection) {
        return null;
    }

    if (normalizedUnresolvedSource.includes(normalizedAppendedSection)) {
        return null;
    }

    return padBook(validateBook(`${normalizedUnresolvedSource}\n\n${normalizedAppendedSection}`));
}
