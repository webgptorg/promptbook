import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_permanent_id, string_agent_url } from '../../../../src/types/typeAliases';
import {
    resolveAgentStateFromSource,
    type ResolvedAgentState,
    type ResolveAgentStateFromSourceOptions,
} from './resolveAgentStateFromSource';

/**
 * Minimal stored-agent shape needed to derive resolved runtime/presentation state.
 */
export type StoredAgentSourceRecord = {
    readonly agentName: string;
    readonly permanentId?: string | null;
    readonly agentSource: string;
};

/**
 * Stored agent row augmented with canonical resolved source/profile.
 */
export type ResolvedStoredAgentState<TAgent extends StoredAgentSourceRecord> = TAgent & ResolvedAgentState & {
    readonly canonicalAgentIdentifier: string;
    readonly canonicalAgentUrl: string_agent_url;
    readonly permanentId?: string_agent_permanent_id;
};

/**
 * Shared dependencies used when resolving many stored agent rows.
 */
export type ResolveStoredAgentStateOptions = Pick<
    ResolveAgentStateFromSourceOptions,
    'adamAgentUrl' | 'agentReferenceResolver'
> & {
    /**
     * Public/current server origin used to build canonical local agent URLs.
     */
    readonly localServerUrl: string;
};

/**
 * Builds one canonical local agent URL from a stored row.
 *
 * @param agent - Stored agent row.
 * @param localServerUrl - Current server origin.
 * @returns Canonical local route URL.
 */
function createCanonicalLocalAgentUrl(agent: StoredAgentSourceRecord, localServerUrl: string): string_agent_url {
    const canonicalAgentIdentifier = agent.permanentId || agent.agentName;
    return `${localServerUrl.replace(/\/+$/g, '')}/agents/${encodeURIComponent(canonicalAgentIdentifier)}` as string_agent_url;
}

/**
 * Derives resolved source/profile for one stored local agent row.
 *
 * @param agent - Stored local agent row.
 * @param options - Shared resolution dependencies.
 * @returns Stored row augmented with canonical resolved state.
 */
export async function resolveStoredAgentState<TAgent extends StoredAgentSourceRecord>(
    agent: TAgent,
    options: ResolveStoredAgentStateOptions,
): Promise<ResolvedStoredAgentState<TAgent>> {
    const canonicalAgentIdentifier = agent.permanentId || agent.agentName;
    const canonicalAgentUrl = createCanonicalLocalAgentUrl(agent, options.localServerUrl);
    const resolvedAgentState = await resolveAgentStateFromSource(agent.agentSource as string_book, {
        adamAgentUrl: options.adamAgentUrl,
        canonicalAgentUrl,
        agentReferenceResolver: options.agentReferenceResolver,
    });

    return {
        ...agent,
        permanentId: (agent.permanentId || undefined) as string_agent_permanent_id | undefined,
        canonicalAgentIdentifier,
        canonicalAgentUrl,
        ...resolvedAgentState,
    };
}

/**
 * Resolves canonical state for multiple stored local agents in parallel.
 *
 * @param agents - Stored local agent rows.
 * @param options - Shared resolution dependencies.
 * @returns Resolved local agent rows in the original order.
 */
export async function resolveStoredAgentStates<TAgent extends StoredAgentSourceRecord>(
    agents: ReadonlyArray<TAgent>,
    options: ResolveStoredAgentStateOptions,
): Promise<Array<ResolvedStoredAgentState<TAgent>>> {
    return Promise.all(agents.map((agent) => resolveStoredAgentState(agent, options)));
}
