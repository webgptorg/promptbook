import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentBasicInformation, string_book } from '../../../../src/_packages/types.index';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { normalizeDomainForMatching } from '../../../../src/utils/validators/url/normalizeDomainForMatching';
import type { FederatedAgentImportConfiguration } from '../constants/federatedAgentImport';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { loadFederatedAgentImportConfiguration } from './federatedAgentImportConfiguration';
import { getFederatedServers } from './getFederatedServers';
import { getWellKnownAgentUrl } from './getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';
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
};

/**
 * Minimal agent identity row used to initialize compact-reference resolution.
 */
type CustomDomainAgentReferenceRow = Pick<CustomDomainAgentRow, 'agentName' | 'permanentId'>;

/**
 * Minimal resolved metadata needed for custom-domain matching.
 */
type ResolvedCustomDomainMetadata = Pick<AgentBasicInformation, 'links' | 'meta'>;

/**
 * Creates a minimal local collection used only for compact-reference initialization.
 *
 * @param agents - Stored server-owned agents.
 * @returns Lightweight collection compatible with the resolver initialization step.
 */
function createResolverAgentCollection(agents: ReadonlyArray<CustomDomainAgentReferenceRow>): AgentCollection {
    return {
        async listAgents() {
            return agents.map(
                (agent) =>
                    ({
                        agentName: agent.agentName,
                        permanentId: agent.permanentId || undefined,
                        agentHash: `custom-domain-${agent.permanentId || agent.agentName}`,
                        meta: {},
                        links: [],
                        capabilities: [],
                        parameters: [],
                        samples: [],
                        knowledgeSources: [],
                        initialMessage: null,
                        personaDescription: null,
                    } satisfies AgentBasicInformation),
            );
        },
    } as unknown as AgentCollection;
}

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
 * Builds the canonical public URL for one local stored agent.
 *
 * @param agent - Stored agent row.
 * @param localServerUrl - Current server origin.
 * @returns Canonical local agent URL.
 */
function createCanonicalLocalAgentUrl(agent: CustomDomainAgentRow, localServerUrl: string): string {
    const canonicalAgentIdentifier = agent.permanentId || agent.agentName;
    return `${localServerUrl.replace(/\/+$/g, '')}/agents/${encodeURIComponent(canonicalAgentIdentifier)}`;
}

/**
 * Parses only the resolved custom-domain metadata used by proxy routing.
 *
 * @param resolvedAgentSource - Agent source after inheritance/import resolution.
 * @returns Resolved domain/link metadata.
 */
function parseResolvedCustomDomainMetadata(resolvedAgentSource: string): ResolvedCustomDomainMetadata {
    const lines = resolvedAgentSource.split(/\r?\n/);
    const meta: AgentBasicInformation['meta'] = {};
    const links: string[] = [];
    let hasSeenTitle = false;
    let isInsideCodeBlock = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!hasSeenTitle) {
            if (!trimmedLine) {
                continue;
            }

            hasSeenTitle = true;
            continue;
        }

        if (trimmedLine.startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;
            continue;
        }

        if (isInsideCodeBlock) {
            continue;
        }

        const metaDomainMatch = /^META DOMAIN(?:\s+(.*))?$/i.exec(trimmedLine);
        if (metaDomainMatch) {
            const domain = (metaDomainMatch[1] || '').trim();
            if (domain) {
                meta.domain = domain;
            }
            continue;
        }

        const metaLinkMatch = /^META LINK(?:\s+(.*))?$/i.exec(trimmedLine);
        if (metaLinkMatch) {
            const link = (metaLinkMatch[1] || '').trim();
            if (link) {
                links.push(link);
            }
        }
    }

    return {
        meta,
        links,
    };
}

/**
 * Resolves the custom-domain metadata for one stored agent using the same
 * inheritance/import resolution path as the rest of the server.
 *
 * @param agent - Stored agent row.
 * @param options - Shared resolution dependencies.
 * @returns Resolved domain/link metadata.
 */
async function resolveCustomDomainMetadataForAgent(
    agent: CustomDomainAgentRow,
    options: {
        readonly localServerUrl: string;
        readonly adamAgentUrl: string;
        readonly agentReferenceResolver: Awaited<ReturnType<typeof createServerAgentReferenceResolver>>;
        readonly federatedAgentImportConfiguration: FederatedAgentImportConfiguration;
    },
): Promise<ResolvedCustomDomainMetadata> {
    const resolvedAgentSource = await resolveInheritedAgentSource(agent.agentSource as string_book, {
        adamAgentUrl: options.adamAgentUrl,
        currentAgentUrl: createCanonicalLocalAgentUrl(agent, options.localServerUrl),
        agentReferenceResolver: options.agentReferenceResolver,
        federatedAgentImportConfiguration: options.federatedAgentImportConfiguration,
    });

    return parseResolvedCustomDomainMetadata(resolvedAgentSource);
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
    const customDomainOrFilter = createCustomDomainOrFilter(host);
    if (!customDomainOrFilter) {
        return null;
    }

    const [federatedServers, adamAgentUrl, federatedAgentImportConfiguration] = await Promise.all([
        getFederatedServers(),
        getWellKnownAgentUrl('ADAM'),
        loadFederatedAgentImportConfiguration(),
    ]);

    for (const server of servers) {
        try {
            const tableName = `${server.tablePrefix}Agent`;
            const { data: matchingCandidates, error: matchingCandidatesError } = await supabase
                .from(tableName)
                .select('agentName, permanentId, agentSource, agentProfile')
                .or(customDomainOrFilter)
                .is('deletedAt', null);

            if (matchingCandidatesError || !Array.isArray(matchingCandidates) || matchingCandidates.length === 0) {
                continue;
            }

            const { data: resolverReferenceAgents, error: resolverReferenceError } = await supabase
                .from(tableName)
                .select('agentName, permanentId')
                .is('deletedAt', null);

            if (resolverReferenceError || !Array.isArray(resolverReferenceAgents)) {
                continue;
            }

            const localServerUrl = createServerPublicUrl(server.domain).href;
            const agentReferenceResolver = await createServerAgentReferenceResolver({
                agentCollection: createResolverAgentCollection(
                    resolverReferenceAgents as Array<CustomDomainAgentReferenceRow>,
                ),
                localServerUrl,
                federatedServers,
            });

            let matchedAgent: CustomDomainAgentRow | undefined;

            for (const agent of matchingCandidates as Array<CustomDomainAgentRow>) {
                const resolvedMetadata = await resolveCustomDomainMetadataForAgent(agent, {
                    localServerUrl,
                    adamAgentUrl,
                    agentReferenceResolver,
                    federatedAgentImportConfiguration,
                });

                if (matchesResolvedCustomDomain(resolvedMetadata, candidates)) {
                    matchedAgent = agent;
                    break;
                }
            }

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
