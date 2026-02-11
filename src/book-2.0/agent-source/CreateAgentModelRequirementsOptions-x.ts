import type { AgentReferenceResolver } from './AgentReferenceResolver';

/**
 * Options for `createAgentModelRequirements` and `createAgentModelRequirementsWithCommitments`.
 *
 * @public exported from `@promptbook/core`
 */
export type CreateAgentModelRequirementsOptions = {
    /**
     * Resolver that transforms compact agent references (FROM, IMPORT, TEAM) into concrete URLs.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;
};
