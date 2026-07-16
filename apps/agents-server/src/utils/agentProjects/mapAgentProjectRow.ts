import type { AgentProjectRecord, AgentProjectRow } from './AgentProjectRecord';
import { resolveAgentProjectDirectory } from './resolveAgentProjectDirectory';

/**
 * Maps one database row to an application project record.
 *
 * @param row - Stored project row.
 * @returns Project record with resolved filesystem path.
 */
export function mapAgentProjectRow(row: AgentProjectRow): AgentProjectRecord {
    return {
        ...row,
        directoryPath: resolveAgentProjectDirectory(row.agentPermanentId, row.directoryName),
    };
}
