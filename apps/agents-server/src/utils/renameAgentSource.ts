import { COMMITMENT_REGISTRY } from '../../../../src/commitments';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';

/**
 * Regex pattern to match horizontal lines (markdown thematic breaks).
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * Finds the line index that contains the agent name.
 *
 * @param lines - Agent source lines.
 * @returns The index of the agent name line, or -1 if none found.
 */
function findAgentNameLineIndex(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        if (HORIZONTAL_LINE_PATTERN.test(line)) {
            continue;
        }

        let isCommitment = false;
        for (const definition of COMMITMENT_REGISTRY) {
            const typeRegex = definition.createTypeRegex();
            const match = typeRegex.exec(trimmed);
            if (match && match.groups?.type) {
                isCommitment = true;
                break;
            }
        }

        if (!isCommitment) {
            return i;
        }
    }

    return -1;
}

/**
 * Replaces the agent name line in the agent source.
 *
 * @param agentSource - The original agent source.
 * @param nextAgentName - The new agent name to insert.
 * @returns Updated agent source with the renamed agent line.
 */
export function renameAgentSource(agentSource: string_book, nextAgentName: string): string_book {
    const lines = agentSource.split(/\r?\n/);
    const agentNameLineIndex = findAgentNameLineIndex(lines);

    if (agentNameLineIndex === -1) {
        return [nextAgentName, ...lines].join('\n') as string_book;
    }

    lines[agentNameLineIndex] = nextAgentName;
    return lines.join('\n') as string_book;
}
