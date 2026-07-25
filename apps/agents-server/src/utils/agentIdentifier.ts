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
 * The permanent identifier is matched case-insensitively so that `/agents/:agentId` routes
 * resolve to the same agent regardless of the letter casing used in the URL. This delegates to
 * the shared core builder to keep a single source of truth for the filter syntax.
 *
 * @param identifier - Agent name or permanent identifier to match.
 * @returns `.or()` filter string safe to pass to Supabase.
 */
export function buildAgentNameOrIdFilter(identifier: string): string {
    return buildAgentNameOrPermanentIdFilter(identifier);
}

/**
 * Compares two agent permanent identifiers case-insensitively.
 *
 * Permanent ids are treated as case-insensitive, so `doQMRg82izNfJa` and `DOQMRG82IZNFJA`
 * refer to the same agent. Empty, `null` or `undefined` ids never match.
 *
 * @param firstPermanentId - First permanent id to compare.
 * @param secondPermanentId - Second permanent id to compare.
 * @returns `true` when both ids are present and equal ignoring case.
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
