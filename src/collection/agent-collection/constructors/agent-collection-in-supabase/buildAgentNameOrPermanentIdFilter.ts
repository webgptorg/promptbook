/**
 * Escapes SQL `LIKE`/`ILIKE` wildcard characters so that a value is matched literally.
 *
 * The escape character `\` itself, the multi-character wildcard `%` and the single-character
 * wildcard `_` are prefixed with a backslash. This turns a case-insensitive `ilike` lookup into
 * an exact (but still case-insensitive) match instead of an unintended pattern match.
 *
 * @param value - Raw value that will be embedded into an `ilike` pattern.
 * @returns Value with every `LIKE` special character escaped.
 *
 * @private internal helper of `buildAgentNameOrPermanentIdFilter`
 */
function escapeLikePattern(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Builds a Supabase `.or()` filter that matches an agent by its human-readable name or its permanent id.
 *
 * The human-readable `agentName` is matched exactly, while the `permanentId` is matched
 * case-insensitively (via `ilike`) so that the same permanent id resolves to the same agent
 * regardless of the letter casing used in the URL.
 *
 * Supabase/PostgREST filters expect values to be URL-encoded so that characters like spaces or
 * punctuation do not break the query syntax (e.g. `agentName.eq.AI Team`). The permanent-id value is
 * additionally `LIKE`-escaped so that a name containing wildcard characters cannot be interpreted as
 * a pattern.
 *
 * @param agentNameOrPermanentId - Agent name or stable permanent identifier to match.
 * @returns `.or()` filter string safe to pass to Supabase.
 *
 * @private internal helper shared by `AgentCollectionInSupabase` and the Agents Server agent lookups
 */
export function buildAgentNameOrPermanentIdFilter(agentNameOrPermanentId: string): string {
    const encodedAgentName = encodeURIComponent(agentNameOrPermanentId);
    const encodedPermanentId = encodeURIComponent(escapeLikePattern(agentNameOrPermanentId));
    return `agentName.eq.${encodedAgentName},permanentId.ilike.${encodedPermanentId}`;
}
