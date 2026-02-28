import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeDomainForMatching } from '../../../../src/utils/validators/url/normalizeDomainForMatching';
import { buildServerTablePrefix } from './serverTablePrefix';

/**
 * Prefix used when generating HTTP URL variants for host matching.
 */
const HTTP_PROTOCOL_PREFIX = 'http://';

/**
 * Prefix used when generating HTTPS URL variants for host matching.
 */
const HTTPS_PROTOCOL_PREFIX = 'https://';

/**
 * Candidate values used when searching one custom host in `agentProfile`.
 */
export type CustomDomainMatchCandidates = {
    /**
     * Candidate values for `agentProfile.meta.domain`.
     */
    domainCandidates: string[];

    /**
     * Candidate values for `agentProfile.links` (`META LINK` compatibility).
     */
    linkCandidates: string[];
};

/**
 * Builds `agentProfile` candidates for one incoming request host.
 *
 * @param host - Raw `Host` header value.
 * @returns Candidate values for both `META DOMAIN` and `META LINK`.
 */
export function createCustomDomainMatchCandidates(host: string): CustomDomainMatchCandidates {
    const normalizedHost = normalizeDomainForMatching(host);
    if (!normalizedHost) {
        return {
            domainCandidates: [],
            linkCandidates: [],
        };
    }

    const loweredHost = host.trim().toLowerCase();

    return {
        domainCandidates: unique([
            normalizedHost,
            `${HTTPS_PROTOCOL_PREFIX}${normalizedHost}`,
            `${HTTP_PROTOCOL_PREFIX}${normalizedHost}`,
        ]),
        linkCandidates: unique([
            loweredHost,
            normalizedHost,
            `${HTTPS_PROTOCOL_PREFIX}${normalizedHost}`,
            `${HTTP_PROTOCOL_PREFIX}${normalizedHost}`,
        ]),
    };
}

/**
 * Creates a PostgREST `or(...)` filter matching both `META DOMAIN` and `META LINK` values.
 *
 * @param host - Raw `Host` header value.
 * @returns OR filter string or `null` when no valid candidates can be produced.
 */
export function createCustomDomainOrFilter(host: string): string | null {
    const { domainCandidates, linkCandidates } = createCustomDomainMatchCandidates(host);

    const domainFilters = domainCandidates.map(
        (domainCandidate) => `agentProfile.cs.${JSON.stringify({ meta: { domain: domainCandidate } })}`,
    );
    const linkFilters = linkCandidates.map(
        (linkCandidate) => `agentProfile.cs.${JSON.stringify({ links: [linkCandidate] })}`,
    );

    const filters = [...domainFilters, ...linkFilters];
    return filters.length > 0 ? filters.join(',') : null;
}

export type CustomDomainResolution = {
    /**
     * Host of the server that holds the agent matching the custom domain.
     */
    serverHost: string;

    /**
     * Name of the agent that should be served for the custom domain.
     */
    agentName: string;
};

/**
 * Resolves a custom host to the matching agent if it is stored in one of the known servers.
 *
 * @param host - The incoming request host header.
 * @param supabase - Supabase client instance.
 * @param servers - List of configured server hosts (`SERVERS`).
 * @returns Resolution data or `null` when no matching agent was found.
 * @private Utility used by middleware for custom domain routing.
 */
export async function resolveCustomDomainAgent(
    host: string,
    supabase: SupabaseClient,
    servers: readonly string[],
): Promise<CustomDomainResolution | null> {
    const orFilter = createCustomDomainOrFilter(host);
    if (!orFilter) {
        return null;
    }

    for (const serverHost of servers) {
        try {
            const tableName = `${buildServerTablePrefix(serverHost)}Agent`;
            const { data } = await supabase
                .from(tableName)
                .select('agentName')
                .or(orFilter)
                .limit(1)
                .maybeSingle();

            if (data && typeof data.agentName === 'string') {
                return {
                    serverHost,
                    agentName: data.agentName,
                };
            }
        } catch {
            // Ignore errors so we can try the next server host.
        }
    }

    return null;
}

/**
 * Returns unique, non-empty values while keeping original order.
 *
 * @param values - Raw candidate values.
 * @returns Ordered unique values.
 */
function unique(values: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        if (!value || seen.has(value)) {
            continue;
        }
        seen.add(value);
        result.push(value);
    }

    return result;
}
