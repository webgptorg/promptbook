import type { AgentModelRequirements } from './AgentModelRequirements';

/**
 * Agent requirements stripped of bookkeeping properties that are never forwarded to LLM providers.
 */
export type SanitizedAgentModelRequirements = Omit<
    AgentModelRequirements,
    'metadata' | 'notes' | 'parentAgentUrl'
>;

/**
 * Removes internal fields before handing the requirements to third-party execution tools.
 *
 * @param requirements - Agent model requirements produced by the commitment system.
 * @returns Sanitized requirements with only the low-level inputs that engines expect.
 */
export function sanitizeAgentModelRequirements(
    requirements: AgentModelRequirements,
): SanitizedAgentModelRequirements {
    const { metadata, notes, parentAgentUrl, ...sanitized } = requirements;
    return sanitized;
}
