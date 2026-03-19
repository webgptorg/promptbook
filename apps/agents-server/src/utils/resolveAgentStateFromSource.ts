import type { AgentBasicInformation, string_agent_url, string_book } from '../../../../src/_packages/types.index';
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { parseAgentSource } from '../../../../src/book-2.0/agent-source/parseAgentSource';
import { resolveTeamCapabilitiesFromAgentSource } from './agentReferenceResolver/resolveTeamCapabilitiesFromAgentSource';
import { resolveInheritedAgentSource } from './resolveInheritedAgentSource';

/**
 * Options for deriving the canonical resolved agent state from an editable source.
 */
export type ResolveAgentStateFromSourceOptions = {
    /**
     * Adam agent URL used when inheritance defaults to Adam.
     */
    readonly adamAgentUrl: string_agent_url;

    /**
     * Canonical URL of the currently resolved agent, used for cycle detection.
     */
    readonly canonicalAgentUrl?: string_agent_url;

    /**
     * Optional compact-reference resolver shared with the current server/request context.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;
};

/**
 * Canonical agent state derived from one unresolved editable source.
 */
export type ResolvedAgentState = {
    /**
     * Editable source stored in the database/book editor.
     */
    readonly unresolvedAgentSource: string_book;

    /**
     * Materialized source after resolving `FROM` and `IMPORT`.
     */
    readonly resolvedAgentSource: string_book;

    /**
     * Parsed presentation/runtime profile derived only from `resolvedAgentSource`.
     */
    readonly resolvedAgentProfile: AgentBasicInformation;
};

/**
 * Replaces parsed TEAM capabilities with compact-reference-aware resolved capabilities.
 *
 * @param capabilities - Capabilities parsed from the resolved source.
 * @param resolvedTeamCapabilities - TEAM capabilities resolved through the shared reference resolver.
 * @returns Capability list with TEAM entries rewritten to their resolved counterparts.
 */
function mergeResolvedTeamCapabilities(
    capabilities: ReadonlyArray<AgentBasicInformation['capabilities'][number]>,
    resolvedTeamCapabilities: ReadonlyArray<AgentBasicInformation['capabilities'][number]>,
): Array<AgentBasicInformation['capabilities'][number]> {
    if (resolvedTeamCapabilities.length === 0) {
        return [...capabilities];
    }

    const mergedCapabilities: Array<AgentBasicInformation['capabilities'][number]> = [];
    let hasInsertedResolvedTeams = false;

    for (const capability of capabilities) {
        if (capability.type === 'team') {
            if (!hasInsertedResolvedTeams) {
                mergedCapabilities.push(...resolvedTeamCapabilities);
                hasInsertedResolvedTeams = true;
            }
            continue;
        }

        mergedCapabilities.push(capability);
    }

    if (!hasInsertedResolvedTeams) {
        mergedCapabilities.push(...resolvedTeamCapabilities);
    }

    return mergedCapabilities;
}

/**
 * Resolves the canonical runtime/presentation state from one unresolved agent source.
 *
 * Everything outside the book editor should consume the returned `resolvedAgentSource`
 * and `resolvedAgentProfile` instead of reparsing the unresolved source.
 *
 * @param unresolvedAgentSource - Editable source stored for the agent.
 * @param options - Shared resolution dependencies.
 * @returns Canonical resolved source and profile.
 */
export async function resolveAgentStateFromSource(
    unresolvedAgentSource: string_book,
    options: ResolveAgentStateFromSourceOptions,
): Promise<ResolvedAgentState> {
    const resolvedAgentSource = await resolveInheritedAgentSource(unresolvedAgentSource, {
        adamAgentUrl: options.adamAgentUrl,
        currentAgentUrl: options.canonicalAgentUrl,
        agentReferenceResolver: options.agentReferenceResolver,
    });
    const resolvedAgentProfile = parseAgentSource(resolvedAgentSource);
    const resolvedTeamCapabilities = await resolveTeamCapabilitiesFromAgentSource(
        resolvedAgentSource,
        options.agentReferenceResolver,
    );

    return {
        unresolvedAgentSource,
        resolvedAgentSource,
        resolvedAgentProfile: {
            ...resolvedAgentProfile,
            capabilities: mergeResolvedTeamCapabilities(resolvedAgentProfile.capabilities, resolvedTeamCapabilities),
        },
    };
}
