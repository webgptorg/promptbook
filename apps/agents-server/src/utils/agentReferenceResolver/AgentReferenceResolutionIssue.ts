import type { BookCommitment } from '../../../../../src/commitments/_base/BookCommitment';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';

/**
 * Structured issue captured when compact agent reference resolution fails.
 */
export type AgentReferenceResolutionIssue = {
    /**
     * Commitment where the unresolved token appeared.
     */
    readonly commitmentType: BookCommitment;

    /**
     * Original token text (for example `{Unknown Agent}` or `@UnknownAgent`).
     */
    readonly token: string;

    /**
     * Normalized token payload used for lookup.
     */
    readonly reference: string;

    /**
     * Human-readable explanation of why the token could not be resolved.
     */
    readonly message: string;
};

/**
 * Extension implemented by resolvers that can expose accumulated resolution issues.
 */
export type IssueTrackingAgentReferenceResolver = AgentReferenceResolver & {
    /**
     * Returns tracked issues and clears the internal queue.
     */
    consumeResolutionIssues(): Array<AgentReferenceResolutionIssue>;
};

/**
 * Type guard for issue-tracking resolver implementations.
 *
 * @param resolver - Resolver instance to check.
 * @returns True when the resolver provides `consumeResolutionIssues`.
 */
function isIssueTrackingAgentReferenceResolver(
    resolver: AgentReferenceResolver,
): resolver is IssueTrackingAgentReferenceResolver {
    return typeof (resolver as Partial<IssueTrackingAgentReferenceResolver>).consumeResolutionIssues === 'function';
}

/**
 * Drains unresolved compact-reference issues from a resolver when supported.
 *
 * @param resolver - Resolver instance that may implement issue tracking.
 * @returns Collected issues or an empty list.
 */
export function consumeAgentReferenceResolutionIssues(
    resolver?: AgentReferenceResolver,
): Array<AgentReferenceResolutionIssue> {
    if (!resolver) {
        return [];
    }

    if (!isIssueTrackingAgentReferenceResolver(resolver)) {
        return [];
    }

    return resolver.consumeResolutionIssues();
}
