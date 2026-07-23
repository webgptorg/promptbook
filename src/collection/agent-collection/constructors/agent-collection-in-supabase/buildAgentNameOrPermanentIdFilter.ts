// cspell:ignore doqmrg iznfja

/**
 * Escapes SQL `LIKE`/`ILIKE` wildcard characters so that a value is matched literally.
 *
 * `LIKE`/`ILIKE` treat `%` and `_` as wildcards and `\` as the escape character. Agent permanent
 * ids are Base58 tokens and never contain these characters, but the same value is also matched
 * against arbitrary agent names, so the wildcards are neutralized to avoid accidental fuzzy matches.
 *
 * @param value - Raw value that will be embedded into a `LIKE`/`ILIKE` pattern.
 * @returns Value with `LIKE`/`ILIKE` special characters escaped.
 *
 * @private internal helper of `buildAgentNameOrPermanentIdFilter`
 */
function escapeSqlLikePattern(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Builds a Supabase `.or()` filter that matches an agent by exact name or case-insensitive permanent id.
 *
 * Agent permanent ids are matched case-insensitively so that `/agents/doQMRg82izNfJa`,
 * `/agents/DOQMRG82IZNFJA`, and `/agents/doqmrg82iznfja` all resolve to the same agent. Agent names
 * keep their existing exact, case-sensitive matching.
 *
 * Supabase/PostgREST filters expect values to be URL-encoded so that characters like spaces or
 * punctuation do not break the query syntax (e.g. `agentName.eq.AI Team`).
 *
 * @param agentNameOrPermanentId - Agent name or stable permanent identifier to match.
 * @returns `.or()` filter string safe to pass to Supabase.
 *
 * @private shared agent lookup helper reused by `AgentCollectionInSupabase` and the Agents Server
 */
export function buildAgentNameOrPermanentIdFilter(agentNameOrPermanentId: string): string {
    const encodedAgentName = encodeURIComponent(agentNameOrPermanentId);
    const encodedPermanentIdPattern = encodeURIComponent(escapeSqlLikePattern(agentNameOrPermanentId));
    return `agentName.eq.${encodedAgentName},permanentId.ilike.${encodedPermanentIdPattern}`;
}
