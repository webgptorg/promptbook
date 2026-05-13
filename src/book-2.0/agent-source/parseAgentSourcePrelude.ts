import type { string_agent_name } from '../../types/string_agent_name';
import type { string_book } from './string_book';

/**
 * Parsed prelude of one agent source.
 *
 * @private internal utility of book agent-source parsing
 */
type AgentSourcePrelude = {
    /**
     * Source split into logical lines.
     */
    readonly lines: string[];

    /**
     * First non-empty line consumed as the agent name.
     */
    readonly agentName: string_agent_name | null;

    /**
     * Zero-based index of the agent-name line.
     */
    readonly agentNameLineIndex: number;

    /**
     * One-based line number of the agent-name line.
     */
    readonly agentNameLineNumber?: number;
};

/**
 * Consumes the agent-name prelude from raw source.
 *
 * Leading whitespace-only lines are skipped. The first subsequent line that contains any
 * non-whitespace characters is always treated as plain-text agent name, even when it starts
 * with a commitment keyword or other book syntax.
 *
 * @param agentSource - Raw agent source.
 * @returns Parsed prelude with shared line metadata.
 *
 * @private internal utility of book agent-source parsing
 */
export function parseAgentSourcePrelude(agentSource: string_book): AgentSourcePrelude {
    const lines = agentSource.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (line === undefined) {
            continue;
        }

        const trimmedLine = line.trim();
        if (!trimmedLine) {
            continue;
        }

        return {
            lines,
            agentName: trimmedLine as string_agent_name,
            agentNameLineIndex: lineIndex,
            agentNameLineNumber: lineIndex + 1,
        };
    }

    return {
        lines,
        agentName: null,
        agentNameLineIndex: -1,
    };
}
