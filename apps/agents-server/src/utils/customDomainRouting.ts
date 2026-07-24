import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AgentBasicInformation,
    string_agent_permanent_id,
    string_agent_url,
    string_book,
} from '../../../../src/_packages/types.index';
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { DEFAULT_MAX_RECURSION } from '../../../../src/config';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../src/errors/ParseError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { normalizeDomainForMatching } from '../../../../src/utils/validators/url/normalizeDomainForMatching';
import type { FederatedAgentImportConfiguration } from '../constants/federatedAgentImport';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { loadFederatedAgentImportConfiguration } from './federatedAgentImportConfiguration';
import { getFederatedServers } from './getFederatedServers';
import { getWellKnownAgentUrl } from './getWellKnownAgentUrl';
import {
    createLocalAgentUrl,
    normalizeLocalAgentUrlReferences,
    normalizeLocalServerUrls,
    resolveLocalAgentRouteReference,
} from './localAgentRouteReferences';
import { createMissingImportedAgentFallback } from './createMissingImportedAgentFallback';
import { resolveInheritedAgentSource, type AgentSourceImporter } from './resolveInheritedAgentSource';
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
 * Minimal resolved metadata needed for custom-domain matching.
 */
type ResolvedCustomDomainMetadata = Pick<AgentBasicInformation, 'links' | 'meta'>;

/**
 * Creates a minimal local collection used only for compact-reference initialization.
 *
 * @param agents - Stored server-owned agents.
 * @returns Lightweight collection compatible with the resolver initialization step.
 */
function createResolverAgentCollection(agents: ReadonlyArray<CustomDomainAgentRow>): AgentCollection {
    const resolveAgent = (agentNameOrPermanentId: string): CustomDomainAgentRow => {
        const agent = agents.find(
            (candidate) =>
                candidate.agentName === agentNameOrPermanentId || candidate.permanentId === agentNameOrPermanentId,
        );

        if (!agent) {
            throw new NotFoundError(`Agent with name or id "${agentNameOrPermanentId}" not found`);
        }

        return agent;
    };

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
        async getAgentPermanentId(agentNameOrPermanentId: string) {
            const agent = resolveAgent(agentNameOrPermanentId);
            return (agent.permanentId || agent.agentName) as string_agent_permanent_id;
        },
        async getAgentSource(agentNameOrPermanentId: string) {
            return resolveAgent(agentNameOrPermanentId).agentSource as string_book;
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
 * Creates an Edge-safe local importer for custom-domain metadata resolution.
 *
 * @param options - Local collection and inheritance dependencies.
 * @returns Local source importer for route-level agent URLs.
 */
function createCustomDomainLocalAgentSourceImporter(options: {
    readonly collection: Pick<AgentCollection, 'getAgentPermanentId' | 'getAgentSource'>;
    readonly localServerUrl: string;
    readonly adamAgentUrl: string_agent_url;
    readonly agentReferenceResolver: AgentReferenceResolver;
    readonly federatedAgentImportConfiguration: FederatedAgentImportConfiguration;
}): AgentSourceImporter {
    const localServerUrls = normalizeLocalServerUrls([options.localServerUrl]);
    const localAgentUrlReferences = normalizeLocalAgentUrlReferences([options.adamAgentUrl]);
    const agentSourceImporter: AgentSourceImporter = async (agentUrl, context) => {
        const localRouteReference = resolveLocalAgentRouteReference(agentUrl, localServerUrls, localAgentUrlReferences);

        if (!localRouteReference) {
            return null;
        }

        const nextRecursionLevel = (context.importAgentOptions.recursionLevel || 0) + 1;
        assertCustomDomainLocalImportRecursionLevel(nextRecursionLevel, agentUrl);

        let agentPermanentId: string_agent_permanent_id;
        let unresolvedAgentSource: string_book;

        try {
            agentPermanentId = await options.collection.getAgentPermanentId(localRouteReference.agentIdentifier);
            unresolvedAgentSource = await options.collection.getAgentSource(agentPermanentId);
        } catch (error) {
            if (error instanceof NotFoundError) {
                return createMissingImportedAgentFallback(agentUrl, 1, error);
            }

            throw error;
        }

        const resolvedAgentName = readAgentSourceTitle(unresolvedAgentSource) || localRouteReference.agentIdentifier;
        const canonicalAgentUrl = createLocalAgentUrl(localRouteReference.localServerUrl, agentPermanentId);

        return resolveInheritedAgentSource(unresolvedAgentSource, {
            adamAgentUrl: options.adamAgentUrl,
            recursionLevel: nextRecursionLevel,
            inheritancePath: context.importAgentOptions.inheritancePath,
            currentAgentUrl: canonicalAgentUrl,
            currentAgentAliases: [
                canonicalAgentUrl,
                createLocalAgentUrl(localRouteReference.localServerUrl, localRouteReference.agentIdentifier),
                createLocalAgentUrl(localRouteReference.localServerUrl, resolvedAgentName),
            ].filter((value, index, values): value is string_agent_url => values.indexOf(value) === index),
            agentReferenceResolver: options.agentReferenceResolver,
            federatedAgentImportConfiguration:
                options.federatedAgentImportConfiguration || context.federatedAgentImportConfiguration,
            agentSourceImporter,
        });
    };

    return agentSourceImporter;
}

/**
 * Reads the first non-empty title line from one book source.
 *
 * @param agentSource - Agent book source.
 * @returns Title or `null` when the source has no title line.
 */
function readAgentSourceTitle(agentSource: string_book): string | null {
    for (const line of agentSource.split(/\r?\n/)) {
        const title = line.trim();

        if (title) {
            return title;
        }
    }

    return null;
}

/**
 * Throws when direct local importing would exceed the configured recursion limit.
 *
 * @param recursionLevel - Next recursion level.
 * @param agentUrl - Local agent URL being imported.
 */
function assertCustomDomainLocalImportRecursionLevel(recursionLevel: number, agentUrl: string_agent_url): void {
    if (recursionLevel <= DEFAULT_MAX_RECURSION) {
        return;
    }

    throw new ParseError(
        spaceTrim(
            (block) => `
                Recursion depth ${recursionLevel} exceeds maximum allowed ${DEFAULT_MAX_RECURSION} while importing local custom-domain agent:

                ${block(agentUrl)}
            `,
        ),
    );
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
        readonly agentSourceImporter: AgentSourceImporter;
    },
): Promise<ResolvedCustomDomainMetadata> {
    const resolvedAgentSource = await resolveInheritedAgentSource(agent.agentSource as string_book, {
        adamAgentUrl: options.adamAgentUrl,
        currentAgentUrl: createCanonicalLocalAgentUrl(agent, options.localServerUrl),
        agentReferenceResolver: options.agentReferenceResolver,
        federatedAgentImportConfiguration: options.federatedAgentImportConfiguration,
        agentSourceImporter: options.agentSourceImporter,
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
                .select('agentName, permanentId, agentSource')
                .is('deletedAt', null);

            if (resolverReferenceError || !Array.isArray(resolverReferenceAgents)) {
                continue;
            }

            const localServerUrl = createServerPublicUrl(server.domain).href;
            const agentCollection = createResolverAgentCollection(
                resolverReferenceAgents as Array<CustomDomainAgentRow>,
            );
            const agentReferenceResolver = await createServerAgentReferenceResolver({
                agentCollection,
                localServerUrl,
                federatedServers,
            });
            const agentSourceImporter = createCustomDomainLocalAgentSourceImporter({
                collection: agentCollection,
                localServerUrl,
                adamAgentUrl,
                agentReferenceResolver,
                federatedAgentImportConfiguration,
            });

            let matchedAgent: CustomDomainAgentRow | undefined;

            for (const agent of matchingCandidates as Array<CustomDomainAgentRow>) {
                const resolvedMetadata = await resolveCustomDomainMetadataForAgent(agent, {
                    localServerUrl,
                    adamAgentUrl,
                    agentReferenceResolver,
                    federatedAgentImportConfiguration,
                    agentSourceImporter,
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
