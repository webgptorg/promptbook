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
 * Supabase/PostgREST filters expect values to be URL-encoded so that characters like
 * spaces or punctuation do not break the query syntax (e.g. `agentName.eq.AI Team`).
 *
 * @param identifier - Agent name or permanent identifier to match.
 * @returns `.or()` filter string safe to pass to Supabase.
 */
export function buildAgentNameOrIdFilter(identifier: string): string {
    const encodedIdentifier = encodeURIComponent(identifier);
    return `agentName.eq.${encodedIdentifier},permanentId.eq.${encodedIdentifier}`;
}
