import { spaceTrim } from 'spacetrim';
import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { COMMITMENT_REGISTRY } from '../../commitments/index';
import type { AgentSourceParseResult } from './AgentSourceParseResult';
import { getBookCommitmentLineType } from './getBookCommitmentLineType';
import { parseAgentSourcePrelude } from './parseAgentSourcePrelude';
import type { ParsedUnknownCommitment } from './ParsedUnknownCommitment';
import type { string_book } from './string_book';

/**
 * Regex pattern to match horizontal lines (markdown thematic breaks)
 * Matches 3 or more hyphens, underscores, or asterisks (with optional spaces between)
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * Registered commitment block currently being collected from Book source.
 *
 * @private internal type of `parseAgentSourceWithCommitments`
 */
type CurrentKnownCommitment = {
    readonly kind: 'known';
    readonly type: string;
    readonly startLineNumber: number;
    readonly originalStartLine: string;
    readonly contentLines: string[];
};

/**
 * Unknown commitment block currently being collected from Book source.
 *
 * @private internal type of `parseAgentSourceWithCommitments`
 */
type CurrentUnknownCommitment = {
    readonly kind: 'unknown';
    readonly type: string;
    readonly startLineNumber: number;
    readonly originalStartLine: string;
    readonly sourceLines: string[];
};

/**
 * Commitment-like source block currently being collected.
 *
 * @private internal type of `parseAgentSourceWithCommitments`
 */
type CurrentCommitment = CurrentKnownCommitment | CurrentUnknownCommitment;

/**
 * Parses agent source using the new commitment system with multiline support
 * This function replaces the hardcoded commitment parsing in the original parseAgentSource
 *
 * The first non-empty line is always consumed as plain-text agent name. Commitment parsing
 * starts only after that title line has been fixed.
 *
 * @private internal utility of `parseAgentSource`
 */
export function parseAgentSourceWithCommitments(agentSource: string_book): Omit<AgentSourceParseResult, 'agentHash'> {
    if (!agentSource || !agentSource.trim()) {
        return {
            agentName: null,
            commitments: [],
            unknownCommitments: [],
            nonCommitmentLines: [],
        };
    }

    const { lines, agentName, agentNameLineIndex, agentNameLineNumber } = parseAgentSourcePrelude(agentSource);

    const commitments: ParsedCommitment[] = [];
    const unknownCommitments: ParsedUnknownCommitment[] = [];
    const nonCommitmentLines: string[] = agentNameLineIndex >= 0 ? [lines[agentNameLineIndex]!] : [];

    // Parse commitments with multiline support.
    let currentCommitment: CurrentCommitment | null = null;

    // Process lines starting from after the agent name line
    const startIndex = agentNameLineIndex >= 0 ? agentNameLineIndex + 1 : 0;
    let isInsideCodeBlock = false;
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }

        const trimmedLine = line.trim();

        // Check if this line starts or ends a code block
        if (trimmedLine.startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;

            appendLineToCurrentCommitmentOrNonCommitmentLines(currentCommitment, line, nonCommitmentLines);
            continue;
        }

        if (isInsideCodeBlock) {
            appendLineToCurrentCommitmentOrNonCommitmentLines(currentCommitment, line, nonCommitmentLines);
            continue;
        }

        // Check if this line starts a new commitment
        let foundNewCommitment = false;
        for (const definition of COMMITMENT_REGISTRY) {
            const typeRegex = definition.createTypeRegex();
            const match = typeRegex.exec(line.trim());

            if (match && match.groups?.type) {
                appendCurrentCommitment(currentCommitment, commitments, unknownCommitments);

                // Extract the initial content from the commitment line
                const fullRegex = definition.createRegex();
                const fullMatch = fullRegex.exec(line.trim());
                const initialContent = fullMatch?.groups?.contents || '';

                // Start a new commitment
                currentCommitment = {
                    kind: 'known',
                    type: definition.type,
                    startLineNumber: i + 1,
                    originalStartLine: line,
                    contentLines: initialContent ? [initialContent] : [],
                };
                foundNewCommitment = true;
                break;
            }
        }

        if (foundNewCommitment) {
            continue;
        }

        const unknownCommitmentType = getBookCommitmentLineType(line);
        if (unknownCommitmentType) {
            appendCurrentCommitment(currentCommitment, commitments, unknownCommitments);
            currentCommitment = {
                kind: 'unknown',
                type: unknownCommitmentType,
                startLineNumber: i + 1,
                originalStartLine: line,
                sourceLines: [line],
            };
            continue;
        }

        // Check if this is a horizontal line (ends any current commitment)
        const isHorizontalLine = HORIZONTAL_LINE_PATTERN.test(line);
        if (isHorizontalLine) {
            appendCurrentCommitment(currentCommitment, commitments, unknownCommitments);
            currentCommitment = null;
            // Add horizontal line to non-commitment lines
            nonCommitmentLines.push(line);
            continue;
        }

        appendLineToCurrentCommitmentOrNonCommitmentLines(currentCommitment, line, nonCommitmentLines);
    }

    appendCurrentCommitment(currentCommitment, commitments, unknownCommitments);

    return {
        agentName,
        agentNameLineNumber,
        commitments,
        unknownCommitments,
        nonCommitmentLines,
    };
}

/**
 * Stores the current known or unknown commitment in its appropriate parsed collection.
 *
 * @param currentCommitment - Commitment-like block collected so far.
 * @param commitments - Parsed registered commitments to append to.
 * @param unknownCommitments - Parsed unregistered commitments to append to.
 *
 * @private internal utility of `parseAgentSourceWithCommitments`
 */
function appendCurrentCommitment(
    currentCommitment: CurrentCommitment | null,
    commitments: ParsedCommitment[],
    unknownCommitments: ParsedUnknownCommitment[],
): void {
    if (!currentCommitment) {
        return;
    }

    if (currentCommitment.kind === 'unknown') {
        unknownCommitments.push({
            type: currentCommitment.type,
            originalLine: currentCommitment.originalStartLine,
            lineNumber: currentCommitment.startLineNumber,
            source: spaceTrim(currentCommitment.sourceLines.join('\n')),
        });
        return;
    }

    commitments.push({
        type: currentCommitment.type as BookCommitment,
        content: spaceTrim(currentCommitment.contentLines.join('\n')),
        originalLine: currentCommitment.originalStartLine,
        lineNumber: currentCommitment.startLineNumber,
    });
}

/**
 * Adds one source line to the active commitment-like block, or to plain source content when none is active.
 *
 * @param currentCommitment - Commitment-like block currently being collected.
 * @param line - Source line to append.
 * @param nonCommitmentLines - Plain source lines to append to when no block is active.
 *
 * @private internal utility of `parseAgentSourceWithCommitments`
 */
function appendLineToCurrentCommitmentOrNonCommitmentLines(
    currentCommitment: CurrentCommitment | null,
    line: string,
    nonCommitmentLines: string[],
): void {
    if (!currentCommitment) {
        nonCommitmentLines.push(line);
        return;
    }

    if (currentCommitment.kind === 'unknown') {
        currentCommitment.sourceLines.push(line);
        return;
    }

    currentCommitment.contentLines.push(line);
}
