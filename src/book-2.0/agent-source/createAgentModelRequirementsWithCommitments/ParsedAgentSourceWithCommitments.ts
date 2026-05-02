import { parseAgentSourceWithCommitments } from '../parseAgentSourceWithCommitments';

/**
 * Parsed agent source data produced by `parseAgentSourceWithCommitments`.
 *
 * @private internal type of `createAgentModelRequirementsWithCommitments`
 */
export type ParsedAgentSourceWithCommitments = ReturnType<typeof parseAgentSourceWithCommitments>;
