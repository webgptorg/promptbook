import type { SupabaseClient } from '@supabase/supabase-js';
import { AgentCollectionInSupabase } from '../../../../src/_packages/core.index';
import type { AgentBasicInformation } from '../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { normalizeDomainForMatching } from '../../../../src/utils/validators/url/normalizeDomainForMatching';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { getFederatedServers } from './getFederatedServers';
import { getWellKnownAgentUrl } from './getWellKnownAgentUrl';
import { resolveStoredAgentStates } from './resolveStoredAgentState';
import { createServerPublicUrl, type ServerRecord } from './serverRegistry';

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

/**
 * Result of resolving one custom domain to an actual server-owned agent.
 */
export type CustomDomainResolution = {
    /**
     * Server that owns the agent matching the custom domain.
     */
    server: ServerRecord;

    /**
     * Name of the agent that should be served for the custom domain.
     */
    agentName: string;
};

/**
 * Minimal persisted agent shape needed for custom-domain resolution.
 */
type CustomDomainAgentRow = {
    readonly agentName: string;
    readonly permanentId: string | null;
    readonly agentSource: string;
    readonly agentProfile?: AgentBasicInformation;
};

/**
 * Checks whether resolved agent metadata matches one incoming custom host.
 *
 * @param profile - Canonical resolved profile derived from agent source.
 * @param candidates - Host variants normalized for both `META DOMAIN` and `META LINK`.
 * @returns `true` when the host should route to the provided agent.
 */
function matchesResolvedCustomDomain(
    profile: Pick<AgentBasicInformation, 'links' | 'meta'>,
    candidates: CustomDomainMatchCandidates,
): boolean {
    const normalizedDomain = normalizeDomainForMatching(profile.meta.domain || '');
    if (normalizedDomain && candidates.domainCandidates.includes(normalizedDomain)) {
        return true;
    }

    return (profile.links || []).some((link: string) => candidates.linkCandidates.includes(link.trim().toLowerCase()));
}

/**
 * Resolves a custom host to the matching agent if it is stored in one of the known servers.
 *
 * @param host - The incoming request host header.
 * @param supabase - Supabase client instance.
 * @param servers - Registered servers from `_Server`.
 * @returns Resolution data or `null` when no matching agent was found.
 */
export async function resolveCustomDomainAgent(
    host: string,
    supabase: SupabaseClient,
    servers: ReadonlyArray<ServerRecord>,
): Promise<CustomDomainResolution | null> {
    const candidates = createCustomDomainMatchCandidates(host);
    if (candidates.domainCandidates.length === 0 && candidates.linkCandidates.length === 0) {
        return null;
    }

    const federatedServers = await getFederatedServers();
    const adamAgentUrl = await getWellKnownAgentUrl('ADAM');

    for (const server of servers) {
        try {
            const tableName = `${server.tablePrefix}Agent`;
            const { data, error } = await supabase
                .from(tableName)
                .select('agentName, permanentId, agentSource, agentProfile')
                .is('deletedAt', null);

            if (error || !Array.isArray(data) || data.length === 0) {
                continue;
            }

            const localServerUrl = createServerPublicUrl(server.domain).href;
            const agentCollection = new AgentCollectionInSupabase(supabase as never, {
                tablePrefix: server.tablePrefix,
            });
            const agentReferenceResolver = await createServerAgentReferenceResolver({
                agentCollection,
                localServerUrl,
                federatedServers,
            });
            const resolvedAgents = await resolveStoredAgentStates(data as Array<CustomDomainAgentRow>, {
                localServerUrl,
                adamAgentUrl,
                agentReferenceResolver,
            });
            const matchedAgent = resolvedAgents.find((agent) =>
                matchesResolvedCustomDomain(agent.resolvedAgentProfile, candidates),
            );

            if (matchedAgent) {
                return {
                    server,
                    agentName: matchedAgent.agentName,
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
