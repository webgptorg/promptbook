import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { normalizeAgentName } from '../../../src/book-2.0/agent-source/normalizeAgentName';

/**
 * Prefix used by external runner repositories whose names carry the stable agent id.
 */
export const AGENT_RUNNER_REPOSITORY_PREFIX = 'agent-';

/**
 * Agent identity fields tested by `ptbk agent-folder run-multiple --ignore`.
 */
export type AgentIgnoreIdentity = {
    readonly agentName?: string;
    readonly normalizedAgentName?: string;
    readonly agentId?: string;
    readonly repositoryName?: string;
};

/**
 * Case-insensitive wildcard matcher for `ptbk agent-folder run-multiple --ignore`.
 */
export type AgentIgnoreMatcher = {
    readonly isEnabled: boolean;
    readonly isIgnored: (identity: AgentIgnoreIdentity) => boolean;
};

/**
 * Creates a case-insensitive matcher for agent ignore patterns.
 */
export function createAgentIgnoreMatcher(ignorePatterns: readonly string[] | undefined): AgentIgnoreMatcher {
    const patternExpressions = (ignorePatterns || [])
        .map((ignorePattern) => ignorePattern.trim())
        .filter((ignorePattern) => ignorePattern.length > 0)
        .map(createWildcardPatternExpression);

    return {
        isEnabled: patternExpressions.length > 0,
        isIgnored: (identity) => {
            if (patternExpressions.length === 0) {
                return false;
            }

            const candidates = collectAgentIgnoreCandidates(identity);
            return patternExpressions.some((patternExpression) =>
                candidates.some((candidate) => patternExpression.test(candidate)),
            );
        },
    };
}

/**
 * Builds ignore identity fields from an agent source book.
 */
export function createAgentIgnoreIdentityFromAgentSource(agentSource: string_book): AgentIgnoreIdentity {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    const agentProfile = parseAgentSource(agentSource);

    return {
        agentName: parseResult.agentName || undefined,
        normalizedAgentName: agentProfile.agentName,
        agentId: agentProfile.permanentId,
    };
}

/**
 * Extracts the stable id part from canonical `agent-<id>` runner repository names.
 */
export function resolveAgentIdFromRepositoryName(repositoryName: string): string | undefined {
    if (!repositoryName.toLowerCase().startsWith(AGENT_RUNNER_REPOSITORY_PREFIX)) {
        return undefined;
    }

    return repositoryName.slice(AGENT_RUNNER_REPOSITORY_PREFIX.length) || undefined;
}

/**
 * Converts one shell-style wildcard pattern into a whole-value regular expression.
 */
function createWildcardPatternExpression(pattern: string): RegExp {
    const escapedPattern = pattern.split('*').map(escapeRegularExpression).join('.*');

    return new RegExp(`^${escapedPattern}$`, 'iu');
}

/**
 * Escapes one literal fragment before it is inserted into a regular expression.
 */
function escapeRegularExpression(value: string): string {
    return value.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
}

/**
 * Collects all string candidates that should be checked against ignore patterns.
 */
function collectAgentIgnoreCandidates(identity: AgentIgnoreIdentity): readonly string[] {
    const candidates = [
        identity.agentName,
        identity.normalizedAgentName,
        identity.agentName ? normalizeAgentName(identity.agentName) : undefined,
        identity.agentId,
        identity.repositoryName,
        identity.repositoryName ? resolveAgentIdFromRepositoryName(identity.repositoryName) : undefined,
    ];

    return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
}
