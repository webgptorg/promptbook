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
