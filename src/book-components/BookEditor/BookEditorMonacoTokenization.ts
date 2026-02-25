import type { string_book } from '../../book-2.0/agent-source/string_book';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { BookCommitment } from '../../commitments/_base/BookCommitment';

/**
 * Regex source for absolute URL references inside TEAM/FROM/IMPORT commitments.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_URL_PATTERN = 'https?:\\/\\/[^\\s{}]+';

/**
 * Regex source for compact `@id` references.
 *
 * @private function of BookEditorMonaco
 */
const AGENT_REFERENCE_AT_PATTERN = '@[A-Za-z0-9_-]+';

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
const AGENT_REFERENCE_COMMITMENT_TYPES: ReadonlySet<BookCommitment> = new Set<BookCommitment>([
    'FROM',
    'IMPORT',
    'IMPORTS',
    'TEAM',
]);

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
const AGENT_REFERENCE_TOKEN_REGEX = new RegExp(
    `${AGENT_REFERENCE_BRACED_PATTERN}|${AGENT_REFERENCE_AT_PATTERN}|${AGENT_REFERENCE_URL_PATTERN}`,
    'g',
);
const AGENT_REFERENCE_BRACED_REGEX = /^\{([\s\S]+)\}$/;
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

                if (token.startsWith('@') && absoluteIndex > 0) {
                    const previousChar = content[absoluteIndex - 1] || '';
                    if (/[A-Za-z0-9_.-]/.test(previousChar)) {
                        continue;
                    }
                }

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
 * @private function of BookEditorMonaco
 */
function collectAgentReferenceCommitmentLineRanges(
    content: string,
    sourceLines: ReadonlyArray<string>,
): Array<CommitmentLineRange> {
    const parsed = parseAgentSourceWithCommitments(content as string_book);
    const ranges: Array<CommitmentLineRange> = [];

    for (let index = 0; index < parsed.commitments.length; index++) {
        const commitment = parsed.commitments[index];
        if (!commitment || !AGENT_REFERENCE_COMMITMENT_TYPES.has(commitment.type)) {
            continue;
        }

        const nextCommitmentStartLine = parsed.commitments[index + 1]?.lineNumber ?? sourceLines.length + 1;
        const endLineNumber = Math.min(nextCommitmentStartLine - 1, sourceLines.length);

        if (commitment.lineNumber > endLineNumber) {
            continue;
        }

        ranges.push({
            startLineNumber: commitment.lineNumber,
            endLineNumber,
        });
    }

    return ranges;
}

/**
 * Agent reference helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export const BookEditorMonacoTokenization = {
    AGENT_URL_REFERENCE_REGEX,
    AGENT_REFERENCE_TOKEN_REGEX,
    AGENT_REFERENCE_BRACED_REGEX,
    AGENT_REFERENCE_HIGHLIGHT_REGEXES,
    extractAgentReferenceValue,
    resolveAgentReferenceToUrl,
    extractAgentReferenceMatches,
};
