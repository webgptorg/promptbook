import type { AgentBasicInformation, string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { resolveAgentStateFromSource } from './resolveAgentStateFromSource';

/**
 * Options for resolving profile fields through `FROM` inheritance.
 */
type ResolveAgentProfileWithInheritanceOptions = {
    /**
     * Adam agent URL used when inheritance defaults to Adam.
     */
    readonly adamAgentUrl: string_agent_url;
    /**
     * Optional compact-reference resolver used for FROM/IMPORT/TEAM commitments.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;
};

/**
 * Resolves the canonical profile from the materialized inherited/imported source.
 *
 * @param agentSource - Original agent source.
 * @param options - Inheritance resolution options.
 * @returns Agent profile with inherited metadata and initial message applied.
 */
export async function resolveAgentProfileWithInheritance(
    agentSource: string_book,
    options: ResolveAgentProfileWithInheritanceOptions,
): Promise<AgentBasicInformation> {
    const resolvedAgentState = await resolveAgentStateFromSource(agentSource, options);
    return resolvedAgentState.resolvedAgentProfile;
}
