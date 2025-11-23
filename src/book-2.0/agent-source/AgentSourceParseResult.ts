import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { string_agent_name } from '../../types/typeAliases';

/**
 * Result of parsing agent source for commitments
 *
 * @private internal utility of `parseAgentSource` and `parseAgentSourceWithCommitments`
 */
export type AgentSourceParseResult = {
    /**
     * The agent name (first line)
     */
    agentName: string_agent_name | null;

    /**
     * All parsed commitments
     */
    commitments: ParsedCommitment[];

    /**
     * Lines that are not commitments (for system message)
     */
    nonCommitmentLines: string[];
};
