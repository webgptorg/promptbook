import { normalizeDomainForMatching } from '../../../../src/utils/validators/url/normalizeDomainForMatching';

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
