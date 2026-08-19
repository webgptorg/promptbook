import type { string_book } from '../../../../src/_packages/types.index'; // <- [🚾]

/**
 * Commitment keyword that declares the parent agent of one book.
 *
 * @private utility of Agents Server inheritance resolution
 */
const FROM_COMMITMENT_TYPE = 'FROM';

/**
 * One explicit `FROM` commitment written in a book.
 *
 * @private utility of Agents Server inheritance resolution
 */
export type ExplicitFromCommitment = {
    /**
     * Zero-based index of the line the commitment was found on, within the scanned lines.
     */
    readonly lineIndex: number;

    /**
     * Trimmed commitment content, empty string for a blank `FROM`.
     */
    readonly content: string;
};

/**
 * Collects every explicit single-line `FROM` commitment of one book.
 *
 * This lightweight parser is intentionally limited to the subset needed by inheritance
 * resolution so it stays safe to bundle into the Next.js proxy path.
 *
 * @param sourceLines - Book source already split into lines.
 * @returns Found `FROM` commitments in source order, empty when the book declares no parent.
 *
 * @private utility of Agents Server inheritance resolution
 */
export function collectExplicitFromCommitments(
    sourceLines: ReadonlyArray<string>,
): ReadonlyArray<ExplicitFromCommitment> {
    const commitmentPrefix = `${FROM_COMMITMENT_TYPE} `;
    const explicitFromCommitments: Array<ExplicitFromCommitment> = [];
    let hasSeenTitle = false;
    let isInsideCodeBlock = false;

    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
        const trimmedLine = (sourceLines[lineIndex] || '').trim();

        if (!hasSeenTitle) {
            if (!trimmedLine) {
                continue;
            }

            hasSeenTitle = true;
            continue;
        }

        if (trimmedLine.startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;
            continue;
        }

        if (isInsideCodeBlock) {
            continue;
        }

        if (trimmedLine === FROM_COMMITMENT_TYPE) {
            explicitFromCommitments.push({ lineIndex, content: '' });
            continue;
        }

        if (trimmedLine.startsWith(commitmentPrefix)) {
            explicitFromCommitments.push({
                lineIndex,
                content: trimmedLine.slice(commitmentPrefix.length).trim(),
            });
        }
    }

    return explicitFromCommitments;
}

/**
 * Returns the effective explicit `FROM` commitment content of one book.
 *
 * A book may repeat `FROM`, in which case the last one wins and overrides every earlier one.
 *
 * @param agentSource - Raw book source.
 * @returns Trimmed commitment content, empty string for a blank explicit `FROM`, or `undefined` when `FROM` is absent.
 *
 * @private utility of Agents Server inheritance resolution
 */
export function getExplicitFromCommitmentContent(agentSource: string_book): string | undefined {
    const explicitFromCommitments = collectExplicitFromCommitments(agentSource.split(/\r?\n/));
    return explicitFromCommitments[explicitFromCommitments.length - 1]?.content;
}

/**
 * Returns true when one book declares no parent at all and therefore implicitly inherits from `@Adam`.
 *
 * Writing no `FROM` commitment is equivalent to writing `FROM @Adam`, so only an explicit
 * `FROM @Null` / `FROM {Void}` turns the inheritance off.
 *
 * @param agentSource - Raw book source.
 * @returns True when the implicit `@Adam` ancestor applies to this book.
 *
 * @private utility of Agents Server inheritance resolution
 */
export function isImplicitAdamInheritance(agentSource: string_book): boolean {
    return getExplicitFromCommitmentContent(agentSource) === undefined;
}
