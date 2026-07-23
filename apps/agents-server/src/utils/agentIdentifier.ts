import { buildAgentNameOrPermanentIdFilter } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/buildAgentNameOrPermanentIdFilter';

/**
 * Minimal agent shape needed to build canonical route identifiers.
 */
type AgentRouteIdentifierSource = {
    /**
     * Human-readable agent name.
     */
    readonly agentName: string;

    /**
     * Stable agent identifier that does not change when the agent is renamed.
     */
    readonly permanentId?: string | null;
};

/**
 * Resolves the canonical identifier used in `/agents/:agentId` routes.
 *
 * @param agent - Agent record carrying both stable id and human-readable name.
 * @returns Permanent id when available, otherwise the legacy agent name.
 */
export function resolveAgentRouteIdentifier(agent: AgentRouteIdentifierSource): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Builds a Supabase `.or()` filter that matches an agent by name or permanent identifier.
 *
 * Agent permanent ids are matched case-insensitively (see {@link buildAgentNameOrPermanentIdFilter}),
 * so `/agents/doQMRg82izNfJa`, `/agents/DOQMRG82IZNFJA`, and `/agents/doqmrg82iznfja` all resolve to
 * the same agent. This re-exports the shared Promptbook Engine helper to keep a single source of truth.
 *
 * @param identifier - Agent name or permanent identifier to match.
 * @returns `.or()` filter string safe to pass to Supabase.
 */
export const buildAgentNameOrIdFilter = buildAgentNameOrPermanentIdFilter;

/**
 * Compares two agent permanent identifiers case-insensitively.
 *
 * Agent permanent ids are Base58 tokens that the Agents Server treats case-insensitively, so
 * `doQMRg82izNfJa`, `DOQMRG82IZNFJA`, and `doqmrg82iznfja` all identify the same agent. Use this
 * whenever a route/API identifier is compared against a stored permanent id in memory.
 *
 * @param firstPermanentId - First permanent id (or `null`/`undefined`).
 * @param secondPermanentId - Second permanent id (or `null`/`undefined`).
 * @returns `true` when both ids are non-empty and equal ignoring case.
 */
export function isSameAgentPermanentId(
    firstPermanentId: string | null | undefined,
    secondPermanentId: string | null | undefined,
): boolean {
    if (!firstPermanentId || !secondPermanentId) {
        return false;
    }

    return firstPermanentId.toLowerCase() === secondPermanentId.toLowerCase();
}
