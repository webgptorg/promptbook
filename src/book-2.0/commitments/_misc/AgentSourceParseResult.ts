import type { ParsedCommitment } from './ParsedCommitment';

/**
 * Result of parsing agent source for commitments
 */

export type AgentSourceParseResult = {
    /**
     * The agent name (first line)
     */
    agentName: string | null;

    /**
     * All parsed commitments
     */
    commitments: ParsedCommitment[];

    /**
     * Lines that are not commitments (for system message)
     */
    nonCommitmentLines: string[];
}
