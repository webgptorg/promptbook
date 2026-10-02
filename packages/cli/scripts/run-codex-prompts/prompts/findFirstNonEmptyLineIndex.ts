/**
 * Finds the first non-empty line within the inclusive bounds.
 *
 * @private internal utility of prompt parsing and status writing
 */
export function findFirstNonEmptyLineIndex(
    lines: readonly string[],
    startLine: number,
    endLine: number,
): number | undefined {
    for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
        const line = lines[lineIndex];
        if (line !== undefined && line.trim() !== '') {
            return lineIndex;
        }
    }

    return undefined;
}
