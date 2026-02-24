import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_permanent_id } from '../../../../../src/types/typeAliases';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import type { AgentReferenceDiagnostic } from './createUnresolvedAgentReferenceDiagnostics';

/**
 * Creates name-collision diagnostics for the agent name line.
 *
 * @param agentSource - Agent source currently edited in BookEditor.
 * @param currentAgentPermanentId - Permanent ID of the agent being edited.
 * @param collection - Agent collection to check for existing names.
 * @returns Array containing collision diagnostic if name is already used by another agent.
 */
export async function createAgentNameCollisionDiagnostics(
    agentSource: string_book,
    currentAgentPermanentId: string_agent_permanent_id,
    collection: AgentCollection,
): Promise<Array<AgentReferenceDiagnostic>> {
    const parsed = parseAgentSourceWithCommitments(agentSource);

    if (!parsed.agentName || !parsed.agentNameLineNumber) {
        return [];
    }

    try {
        const existingAgentPermanentId = await collection.getAgentPermanentId(parsed.agentName);

        if (existingAgentPermanentId !== currentAgentPermanentId) {
            // Found another agent with the same name
            return [
                {
                    startLineNumber: parsed.agentNameLineNumber,
                    startColumn: 1,
                    endLineNumber: parsed.agentNameLineNumber,
                    endColumn: parsed.agentName.length + 1,
                    message: `Agent name "${parsed.agentName}" is already used by another agent. This agent will only be referencable by ID.`,
                    source: 'agent-name-collision',
                },
            ];
        }
    } catch (error) {
        // NotFoundError means no collision, which is good
    }

    return [];
}
