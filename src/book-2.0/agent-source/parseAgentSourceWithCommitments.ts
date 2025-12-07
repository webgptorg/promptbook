import { spaceTrim } from 'spacetrim';
import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { COMMITMENT_REGISTRY } from '../../commitments/index';
import type { string_agent_name } from '../../types/typeAliases';
import type { AgentSourceParseResult } from './AgentSourceParseResult';
import type { string_book } from './string_book';

/**
 * Regex pattern to match horizontal lines (markdown thematic breaks)
 * Matches 3 or more hyphens, underscores, or asterisks (with optional spaces between)
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * Parses agent source using the new commitment system with multiline support
 * This function replaces the hardcoded commitment parsing in the original parseAgentSource
 *
 * @private internal utility of `parseAgentSource`
 */
export function parseAgentSourceWithCommitments(agentSource: string_book): Omit<AgentSourceParseResult, 'agentHash'> {
    if (!agentSource || !agentSource.trim()) {
        return {
            agentName: null,
            commitments: [],
            nonCommitmentLines: [],
        };
    }

    const lines = agentSource.split('\n');
    const agentName = (lines[0]?.trim() || null) as string_agent_name | null;
    const commitments: ParsedCommitment[] = [];
    const nonCommitmentLines: string[] = [];

    // Always add the first line (agent name) to non-commitment lines
    if (lines[0] !== undefined) {
        nonCommitmentLines.push(lines[0]);
    }

    // Parse commitments with multiline support
    let currentCommitment: {
        type: string;
        startLineNumber: number;
        originalStartLine: string;
        contentLines: string[];
    } | null = null;

    // Process lines starting from the second line (skip agent name)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }

        // Check if this line starts a new commitment
        let foundNewCommitment = false;
        for (const definition of COMMITMENT_REGISTRY) {
            const typeRegex = definition.createTypeRegex();
            const match = typeRegex.exec(line.trim());

            if (match && match.groups?.type) {
                // Save the previous commitment if it exists
                if (currentCommitment) {
                    const fullContent = currentCommitment.contentLines.join('\n');
                    commitments.push({
                        type: currentCommitment.type as BookCommitment,
                        content: spaceTrim(fullContent),
                        originalLine: currentCommitment.originalStartLine,
                        lineNumber: currentCommitment.startLineNumber,
                    });
                }

                // Extract the initial content from the commitment line
                const fullRegex = definition.createRegex();
                const fullMatch = fullRegex.exec(line.trim());
                const initialContent = fullMatch?.groups?.contents || '';

                // Start a new commitment
                currentCommitment = {
                    type: definition.type,
                    startLineNumber: i + 1,
                    originalStartLine: line,
                    contentLines: initialContent ? [initialContent] : [],
                };
                foundNewCommitment = true;
                break;
            }
        }

        // Check if this is a horizontal line (ends any current commitment)
        const isHorizontalLine = HORIZONTAL_LINE_PATTERN.test(line);
        if (isHorizontalLine) {
            // Save the current commitment if it exists
            if (currentCommitment) {
                const fullContent = currentCommitment.contentLines.join('\n');
                commitments.push({
                    type: currentCommitment.type as BookCommitment,
                    content: spaceTrim(fullContent),
                    originalLine: currentCommitment.originalStartLine,
                    lineNumber: currentCommitment.startLineNumber,
                });
                currentCommitment = null;
            }
            // Add horizontal line to non-commitment lines
            nonCommitmentLines.push(line);
            continue;
        }

        if (!foundNewCommitment) {
            if (currentCommitment) {
                // This line belongs to the current commitment
                currentCommitment.contentLines.push(line);
            } else {
                // This line is not part of any commitment
                nonCommitmentLines.push(line);
            }
        }
    }

    // Don't forget to save the last commitment if it exists
    if (currentCommitment) {
        const fullContent = currentCommitment.contentLines.join('\n');
        commitments.push({
            type: currentCommitment.type as BookCommitment,
            content: spaceTrim(fullContent) as BookCommitment,
            originalLine: currentCommitment.originalStartLine,
            lineNumber: currentCommitment.startLineNumber,
        });
    }

    return {
        agentName,
        commitments,
        nonCommitmentLines,
    };
}
