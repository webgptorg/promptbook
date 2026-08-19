import type { string_book } from '../../../../src/_packages/types.index'; // <- [🚾]

/**
 * Commitment keyword that declares the parent agent of one book.
 *
 * @private utility of Agents Server inheritance resolution
 */
const FROM_COMMITMENT_TYPE = 'FROM';

/**
 * Returns the last explicit single-line `FROM` commitment content of one book.
 *
 * This lightweight parser is intentionally limited to the subset needed by inheritance
 * resolution so it stays safe to bundle into the Next.js proxy path.
 *
 * @param agentSource - Raw book source.
 * @returns Trimmed commitment content, empty string for a blank explicit `FROM`, or `undefined` when `FROM` is absent.
 *
 * @private utility of Agents Server inheritance resolution
 */
export function getExplicitFromCommitmentContent(agentSource: string_book): string | undefined {
    const commitmentPrefix = `${FROM_COMMITMENT_TYPE} `;
    const lines = agentSource.split(/\r?\n/);
    let hasSeenTitle = false;
    let isInsideCodeBlock = false;
    let matchedContent: string | undefined;

    for (const line of lines) {
        const trimmedLine = line.trim();

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
            matchedContent = '';
            continue;
        }

        if (trimmedLine.startsWith(commitmentPrefix)) {
            matchedContent = trimmedLine.slice(commitmentPrefix.length).trim();
        }
    }

    return matchedContent;
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
