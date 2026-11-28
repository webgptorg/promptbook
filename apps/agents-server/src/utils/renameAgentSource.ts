import { parseAgentSourcePrelude } from '../../../../src/book-2.0/agent-source/parseAgentSourcePrelude';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';

/**
 * Replaces the first non-empty agent-name line in the agent source.
 *
 * @param agentSource - The original agent source.
 * @param nextAgentName - The new agent name to insert.
 * @returns Updated agent source with the renamed agent line.
 */
export function renameAgentSource(agentSource: string_book, nextAgentName: string): string_book {
    const { lines, agentNameLineIndex } = parseAgentSourcePrelude(agentSource);

    if (agentNameLineIndex === -1) {
        return [nextAgentName, ...lines].join('\n') as string_book;
    }

    lines[agentNameLineIndex] = nextAgentName;
    return lines.join('\n') as string_book;
}
