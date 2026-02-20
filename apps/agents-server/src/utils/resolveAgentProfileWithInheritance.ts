import { parseAgentSource } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { AgentBasicInformation, string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

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
 * Resolves inherited profile fields (`META`, `INITIAL MESSAGE`, etc.) while preserving
 * capability parsing semantics from the original source.
 *
 * @param agentSource - Original agent source.
 * @param options - Inheritance resolution options.
 * @returns Agent profile with inherited metadata and initial message applied.
 */
export async function resolveAgentProfileWithInheritance(
    agentSource: string_book,
    options: ResolveAgentProfileWithInheritanceOptions,
): Promise<AgentBasicInformation> {
    const baseProfile = parseAgentSource(agentSource);
    const inheritedAgentSource = await resolveInheritedAgentSource(agentSource, options);
    const inheritedProfile = parseAgentSource(inheritedAgentSource);

    return {
        ...baseProfile,
        personaDescription: inheritedProfile.personaDescription,
        initialMessage: inheritedProfile.initialMessage,
        meta: inheritedProfile.meta,
        links: inheritedProfile.links,
        knowledgeSources: inheritedProfile.knowledgeSources,
    };
}
