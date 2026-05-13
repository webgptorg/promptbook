import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import type { string_agent_name } from '../../types/string_agent_name';

/**
 * Result of parsing agent source for commitments
 *
 * @private internal utility of `parseAgentSource` and `parseAgentSourceWithCommitments`
 */
export type AgentSourceParseResult = {
    /**
     * The agent name taken from the first non-empty line after leading whitespace-only lines.
     */
    agentName: string_agent_name | null;

    /**
     * The line number where the agent name was found (1-based)
     */
    agentNameLineNumber?: number;

    /**
     * All parsed commitments
     */
    commitments: ParsedCommitment[];

    /**
     * Lines that are not commitments (for system message)
     */
    nonCommitmentLines: string[];
};
