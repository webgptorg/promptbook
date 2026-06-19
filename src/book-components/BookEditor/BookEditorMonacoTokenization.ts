/**
 * Regex source for absolute URL references inside TEAM/FROM/IMPORT commitments.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_URL_PATTERN = 'https?:\\/\\/[^\\s{}]+';

/**
 * Regex source for compact `@id` references.
 * The negative lookbehind `(?<!\S)` ensures the `@` is preceded only by whitespace or is at the
 * start of the string, so email addresses like `team@foo.bar` are not treated as agent references.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_AT_PATTERN = '(?<!\\S)@[A-Za-z0-9_-]+';

/**
 * Regex source for braced references (`{Agent}`, `{Agent Name}`, `{https://...}`).
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_BRACED_PATTERN = '\\{[^{}\\r\\n]+\\}';

/**
 * Commitment types where compact agent references are supported.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_COMMITMENT_TYPES = ['FROM', 'IMPORT', 'IMPORTS', 'TEAM'] as const;

/**
 * Regex matching any line that starts with one or more all-uppercase words (minimum 2 characters each).
 * Used to detect commitment line boundaries without a hardcoded list of commitment types.
 *
 * Single-letter uppercase words (e.g. "V", "A") are excluded to avoid false positives with
 * natural-language sentences that start with a short uppercase word.
 *
 * @private function of BookEditorMonaco
 */
const DYNAMIC_COMMITMENT_REGEX = /^\s*[A-Z][A-Z0-9]+(?:\s+[A-Z][A-Z0-9]+)*(?=\s|$)/;

/**
 * Regex pattern to match horizontal lines.
 *
 * @private function of BookEditorMonaco
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

const BOOK_EDITOR_COMMITMENT_LINE_REGEX = DYNAMIC_COMMITMENT_REGEX;
const AGENT_REFERENCE_COMMITMENT_LINE_REGEX = createCommitmentLineRegex(AGENT_REFERENCE_COMMITMENT_TYPES);

/**
 * Range descriptor for one commitment block in source coordinates.
 *
 * @private function of BookEditorMonaco
 */
type CommitmentLineRange = {
    readonly startLineNumber: number;
    readonly endLineNumber: number;
};

/**
 * Matched agent reference token used by Monaco links.
 *
 * @private function of BookEditorMonaco
 */
type AgentReferenceMatch = {
    readonly value: string;
    readonly url: string;
    readonly index: number;
    readonly length: number;
};

/**
 * Agent reference helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_URL_REFERENCE_REGEX = new RegExp(`^${AGENT_REFERENCE_URL_PATTERN}$`, 'i');
/**
 * Pattern matching agent reference token.
 */
const AGENT_REFERENCE_TOKEN_REGEX = new RegExp(
    `${AGENT_REFERENCE_BRACED_PATTERN}|${AGENT_REFERENCE_AT_PATTERN}|${AGENT_REFERENCE_URL_PATTERN}`,
    'g',
);
/**
 * Pattern matching agent reference braced.
 */
const AGENT_REFERENCE_BRACED_REGEX = /^\{([\s\S]+)\}$/;
/**
 * Constant for agent reference highlight regexes.
 */
const AGENT_REFERENCE_HIGHLIGHT_REGEXES = [
    new RegExp(AGENT_REFERENCE_BRACED_PATTERN),
    new RegExp(AGENT_REFERENCE_URL_PATTERN),
    new RegExp(AGENT_REFERENCE_AT_PATTERN),
] as const;

/**
 * Extracts plain reference payload from one token.
 *
 * @param token - Matched reference token.
 * @returns Normalized reference payload.
 *
 * @private function of BookEditorMonaco
 */
const extractAgentReferenceValue = (token: string): string => {
    if (token.startsWith('@')) {
        return token.slice(1).trim();
    }

    const bracedMatch = token.match(AGENT_REFERENCE_BRACED_REGEX);
    if (bracedMatch?.[1] !== undefined) {
        return bracedMatch[1].trim();
    }

    return token.trim();
};

/**
 * Resolves reference payload to URL used by Monaco links.
 *
 * @param referenceValue - Token payload extracted from compact syntax.
 * @returns Absolute/local agent URL or null for invalid values.
 *
 * @private function of BookEditorMonaco
 */
const resolveAgentReferenceToUrl = (referenceValue: string): string | null => {
    const normalizedReferenceValue = referenceValue.replace(/[),.;!?]+$/g, '').trim();

    if (!normalizedReferenceValue) {
        return null;
    }

    if (AGENT_URL_REFERENCE_REGEX.test(normalizedReferenceValue)) {
        return normalizedReferenceValue;
    }

    if (normalizedReferenceValue.startsWith('http://') || normalizedReferenceValue.startsWith('https://')) {
        return null;
    }

    const encoded = encodeURIComponent(normalizedReferenceValue);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/agents/${encoded}`;
};

/**
 * Extracts compact agent-reference links from source, limited to FROM/IMPORT/TEAM commitments.
 *
 * @param content - Full source currently open in BookEditor.
 * @returns Matched references with source offsets.
 *
 * @private function of BookEditorMonaco
 */
const extractAgentReferenceMatches = (content: string): Array<AgentReferenceMatch> => {
    const matches: Array<AgentReferenceMatch> = [];
    const sourceLines = content.split(/\r?\n/);
    const lineStartOffsets = collectLineStartOffsets(content, sourceLines);
    const commitmentRanges = collectAgentReferenceCommitmentLineRanges(content, sourceLines);

    for (const commitmentRange of commitmentRanges) {
        let isInsideCodeBlock = false;

        for (
            let lineNumber = commitmentRange.startLineNumber;
            lineNumber <= commitmentRange.endLineNumber;
            lineNumber++
        ) {
            const sourceLine = sourceLines[lineNumber - 1] || '';
            const lineStartOffset = lineStartOffsets[lineNumber - 1] || 0;

            if (/^\s*```/.test(sourceLine)) {
                isInsideCodeBlock = !isInsideCodeBlock;
                continue;
            }

            if (isInsideCodeBlock) {
                continue;
            }

            AGENT_REFERENCE_TOKEN_REGEX.lastIndex = 0;

            let match: RegExpExecArray | null;
            while ((match = AGENT_REFERENCE_TOKEN_REGEX.exec(sourceLine)) !== null) {
                const token = match[0];
                const indexInLine = match.index;

                if (!token || indexInLine === undefined) {
                    continue;
                }

                const absoluteIndex = lineStartOffset + indexInLine;

                const value = extractAgentReferenceValue(token);
                const url = resolveAgentReferenceToUrl(value);

                if (!url) {
                    continue;
                }

                matches.push({
                    value,
                    url,
                    index: absoluteIndex,
                    length: token.length,
                });
            }
        }
    }

    return matches;
};

/**
 * Collects 0-based source offsets for each line start.
 *
 * @param content - Full source text.
 * @param sourceLines - Source split by newlines.
 * @returns Offsets aligned with `sourceLines`.
 *
 * @private function of BookEditorMonaco
 */
function collectLineStartOffsets(content: string, sourceLines: ReadonlyArray<string>): Array<number> {
    const lineStartOffsets: Array<number> = [];
    let offset = 0;

    for (const sourceLine of sourceLines) {
        lineStartOffsets.push(offset);
        offset += sourceLine.length;

        if (content.slice(offset, offset + 2) === '\r\n') {
            offset += 2;
            continue;
        }

        if (content[offset] === '\n' || content[offset] === '\r') {
            offset += 1;
        }
    }

    return lineStartOffsets;
}

/**
 * Finds line ranges for commitments that support agent references.
 *
 * @param content - Full source text.
 * @param sourceLines - Source split by newlines.
 * @returns Line ranges that should be scanned for references.
 *
 * @private function of BookEditorMonaco
 */
function collectAgentReferenceCommitmentLineRanges(
    content: string,
    sourceLines: ReadonlyArray<string>,
): Array<CommitmentLineRange> {
    const ranges: Array<CommitmentLineRange> = [];
    let activeRangeStartLineNumber: number | null = null;
    let isInsideCodeBlock = false;
    const startLineIndex = findBookBodyStartLineIndex(sourceLines);

    for (let lineIndex = startLineIndex; lineIndex < sourceLines.length; lineIndex++) {
        const line = sourceLines[lineIndex] || '';
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;
            continue;
        }

        if (isInsideCodeBlock) {
            continue;
        }

        if (HORIZONTAL_LINE_PATTERN.test(line)) {
            if (activeRangeStartLineNumber !== null) {
                ranges.push({
                    startLineNumber: activeRangeStartLineNumber,
                    endLineNumber: lineIndex,
                });
                activeRangeStartLineNumber = null;
            }
            continue;
        }

        if (!BOOK_EDITOR_COMMITMENT_LINE_REGEX.test(trimmedLine)) {
            continue;
        }

        if (activeRangeStartLineNumber !== null) {
            ranges.push({
                startLineNumber: activeRangeStartLineNumber,
                endLineNumber: lineIndex,
            });
        }

        activeRangeStartLineNumber = AGENT_REFERENCE_COMMITMENT_LINE_REGEX.test(trimmedLine) ? lineIndex + 1 : null;
    }

    if (activeRangeStartLineNumber !== null) {
        ranges.push({
            startLineNumber: activeRangeStartLineNumber,
            endLineNumber: sourceLines.length,
        });
    }

    return ranges;
}

function createCommitmentLineRegex(commitmentTypes: ReadonlyArray<string>): RegExp {
    const commitmentPattern = [...commitmentTypes]
        .sort((a, b) => b.length - a.length)
        .map((type) => type.replace(/\s+/, '\\s+'))
        .join('|');

    return new RegExp(`^\\s*(${commitmentPattern})(?=\\s|$)`, 'i');
}

function findBookBodyStartLineIndex(sourceLines: ReadonlyArray<string>): number {
    const titleLineIndex = sourceLines.findIndex((line) => line.trim().length > 0);

    return titleLineIndex === -1 ? 0 : titleLineIndex + 1;
}

/**
 * Agent reference helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export const BookEditorMonacoTokenization = {
    DYNAMIC_COMMITMENT_REGEX,
    AGENT_URL_REFERENCE_REGEX,
    AGENT_REFERENCE_TOKEN_REGEX,
    AGENT_REFERENCE_BRACED_REGEX,
    AGENT_REFERENCE_HIGHLIGHT_REGEXES,
    extractAgentReferenceValue,
    resolveAgentReferenceToUrl,
    extractAgentReferenceMatches,
};
